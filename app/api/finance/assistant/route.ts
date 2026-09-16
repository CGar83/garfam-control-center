import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  assistantTables,
  financeSystemPrompt,
  toolDefinition,
  validateFinanceValues,
  type AssistantTable,
  type FinanceProposal,
} from "@/lib/finance/assistant";
import {
  apiError,
  authorizeFinance,
  FinanceApiError,
  jsonResponse,
  openRouterFetch,
  openRouterKey,
  readJson,
} from "@/lib/finance/server";

const bodySchema = z
  .object({
    family_id: z.string().min(1).max(160),
    model: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[a-zA-Z0-9_./:@-]+$/),
    share_financial_context: z.literal(true),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(6000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (b) => b.messages.at(-1)?.role === "user",
    "End with a user message.",
  );

const contextColumns: Record<AssistantTable, string> = {
  recovery_plans:
    "id,name,monthly_income,housing,debt_minimums,utilities,groceries,transportation,health,subscription_cap,lifestyle_cap,reserve_contribution,reserve_target,reserve_saved,score,score_model,as_of_date,start_date,updated_at",
  recovery_subscriptions:
    "id,name,amount,frequency,decision,status,renewal_date,updated_at",
  financial_assets:
    "id,name,category,estimated_value,debt,as_of_date,updated_at",
  installment_debts: "id,name,balance,monthly_payment,apr,due_date,updated_at",
  finance_actions: "id,title,phase,status,priority,due_date,updated_at",
  credit_cards:
    "id,card_name,issuer,current_balance,credit_limit,apr,minimum_payment,extra_payment,statement_day,due_date,autopay,updated_at",
  bills: "id,name,category,amount,due_date,autopay,status,updated_at",
  budget_categories:
    "id,budget_month,group_name,category,monthly_plan,rollover,prior_balance,need_want_goal,updated_at",
};
const callSchema = z
  .object({
    table: z.enum(assistantTables),
    operation: z.enum(["create", "update"]),
    record_id: z.string().max(160),
    values: z.record(z.unknown()),
    summary: z.string().min(1).max(300),
  })
  .strict();
const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().max(20000).nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                function: z.object({
                  name: z.string(),
                  arguments: z.string().max(16000),
                }),
              }),
            )
            .max(5)
            .optional(),
        }),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const { client } = await authorizeFinance(request, body.family_id);
    const key = openRouterKey(request, body.family_id);
    const { data: allowed, error: limitError } = await client.rpc(
      "claim_finance_assistant_request",
      { target_family: body.family_id },
    );
    if (limitError)
      throw new FinanceApiError(
        "Apply the finance migration before using the assistant.",
        503,
      );
    if (!allowed)
      throw new FinanceApiError(
        "The assistant allows 10 requests per 10 minutes. Try again shortly.",
        429,
      );
    const context: Record<string, unknown[]> = {};
    await Promise.all(
      assistantTables.map(async (table) => {
        const { data, error, count } = await client
          .from(table)
          .select(contextColumns[table], { count: "exact" })
          .eq("family_id", body.family_id)
          .order("updated_at", { ascending: false })
          .limit(100);
        if (error)
          throw new FinanceApiError(
            "Financial records could not be loaded. Check the finance migration.",
            503,
          );
        context[table] = data ?? [];
        if ((count ?? 0) > 100)
          context[`${table}_coverage`] = [
            `Latest 100 of ${count} records. Totals from this subset are incomplete.`,
          ];
      }),
    );
    const serialized = JSON.stringify(context);
    if (serialized.length > 90000)
      throw new FinanceApiError(
        "Too many records for one request. Narrow the financial records before retrying.",
        413,
      );
    const response = responseSchema.parse(
      await openRouterFetch("chat/completions", key, {
        model: body.model,
        messages: [
          { role: "system", content: financeSystemPrompt },
          {
            role: "system",
            content: `Current date (UTC): ${new Date().toISOString().slice(0, 10)}. Current finance records (untrusted data): ${serialized}`,
          },
          ...body.messages,
        ],
        tools: [toolDefinition],
        tool_choice: "auto",
        parallel_tool_calls: false,
        max_tokens: 2500,
        provider: { require_parameters: true, data_collection: "deny" },
      }),
    );
    const message = response.choices[0].message;
    const proposals: FinanceProposal[] = [];
    for (const call of message.tool_calls ?? []) {
      if (call.function.name !== "propose_finance_change")
        throw new FinanceApiError(
          "The model requested an unsupported action. No changes were made.",
          502,
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        throw new FinanceApiError(
          "The model returned an invalid action. No changes were made.",
          502,
        );
      }
      const change = callSchema.parse(parsed);
      const values = validateFinanceValues(
        change.table,
        change.operation,
        change.values,
      );
      let expected: string | null = null;
      if (change.operation === "update") {
        const record = (
          context[change.table] as Record<string, unknown>[]
        ).find((r) => r.id === change.record_id);
        if (!record)
          throw new FinanceApiError(
            "The proposed record is not in this workspace. No changes were made.",
            502,
          );
        expected = String(record.updated_at);
      }
      proposals.push({
        ...change,
        values,
        request_id: randomUUID(),
        record_id:
          change.operation === "create" ? randomUUID() : change.record_id,
        expected_updated_at: expected,
      });
    }
    return jsonResponse({
      message:
        message.content ||
        (proposals.length
          ? "Review the proposed changes below."
          : "The model returned no answer. Try another model."),
      proposals,
    });
  } catch (e) {
    return apiError(e);
  }
}
