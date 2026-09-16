import { randomUUID } from "node:crypto";
import {
  priorSessionReferences,
  logMemoryInstructions,
} from "@/lib/assistant/log-server";
import { assistantContextSchema } from "@/lib/assistant/context";
import {
  contextKey,
  retrieveContext,
  workspaceSystemPrompt,
} from "@/lib/assistant/retrieval";
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
  readJson,
} from "@/lib/finance/server";
import {
  loadConversation,
  resolveOpenRouterKey,
  saveConversation,
} from "@/lib/finance/persistence";
import {
  conversationContext,
  type SavedFinanceMessage,
} from "@/lib/finance/conversation";

const bodySchema = z
  .object({
    family_id: z.string().min(1).max(160),
    model: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[a-zA-Z0-9_./:@-]+$/),
    share_financial_context: z.literal(true),
    conversation_revision: z.number().int().nonnegative().optional(),
    context: assistantContextSchema.optional(),
    reference_prior_sessions: z.boolean().default(false),
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
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      cost: z.number().finite().nonnegative().nullable().optional(),
    })
    .nullable()
    .optional(),
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
    const access = await authorizeFinance(request, body.family_id);
    if (body.conversation_revision === undefined)
      throw new FinanceApiError(
        "Reload the saved conversation before sending.",
        409,
      );
    const scope = contextKey(body.context);
    const { client } = access;
    const key = await resolveOpenRouterKey(request, body.family_id, access);
    const saved = await loadConversation(
      access,
      body.family_id,
      body.model,
      scope,
    );
    if (saved && saved.revision !== body.conversation_revision)
      throw new FinanceApiError(
        "This conversation changed in another tab. Reload its history before sending again.",
        409,
      );
    if (saved && saved.messages.length > 98)
      throw new FinanceApiError(
        "This session has reached 100 messages. Choose New session to keep its log and continue.",
        409,
      );
    const history: SavedFinanceMessage[] = saved
      ? [
          ...saved.messages,
          {
            ...body.messages[body.messages.length - 1],
            created_at: new Date().toISOString(),
          },
        ]
      : body.messages;
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
    const snapshot = body.context
      ? await retrieveContext(access, body.family_id, body.context)
      : null;
    const context: Record<string, unknown[]> = snapshot?.records ?? {};
    if (!snapshot)
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
    if (body.reference_prior_sessions && !saved)
      throw new FinanceApiError(
        "Reload the saved conversation before referencing prior sessions.",
        409,
      );
    const logReferences = body.reference_prior_sessions
      ? await priorSessionReferences(
          access,
          body.family_id,
          body.model,
          scope,
          body.messages.at(-1)!.content,
        )
      : [];
    const started = Date.now();
    const response = responseSchema.parse(
      await openRouterFetch("chat/completions", key, {
        model: body.model,
        messages: [
          { role: "system", content: financeSystemPrompt },
          ...(logReferences.length
            ? [
                {
                  role: "system",
                  content: `${logMemoryInstructions}\n${JSON.stringify(logReferences)}`,
                },
              ]
            : []),
          ...(snapshot
            ? [
                { role: "system", content: workspaceSystemPrompt },
                {
                  role: "system",
                  content: `Selected review: ${JSON.stringify(body.context)}. Coverage: ${JSON.stringify(snapshot.coverage)}. Retrieved at ${snapshot.fetched_at}. Files and external calendars were not opened.`,
                },
              ]
            : []),
          {
            role: "system",
            content: `Current date (UTC): ${new Date().toISOString().slice(0, 10)}. Current ${body.context ? "workspace" : "finance"} records (untrusted data): ${serialized}`,
          },
          {
            role: "system",
            content:
              "Only recent conversation excerpts fit in this request. Do not claim to remember omitted history. Historical proposals are not proof that changes were applied; use current records.",
          },
          ...conversationContext(history),
        ],
        ...(assistantTables.some((table) => Object.hasOwn(context, table))
          ? { tools: [toolDefinition], tool_choice: "auto" }
          : {}),
        // Keep the required parameter set portable; proposals are validated and reviewed, never executed here.
        max_tokens: 2500,
        provider: { require_parameters: true, data_collection: "deny" },
      }),
    );
    const message = response.choices[0].message;
    const trace = {
      request_id: randomUUID(),
      prompt_version: "workspace-log-v1" as const,
      latency_ms: Date.now() - started,
      ...(response.usage?.prompt_tokens !== undefined
        ? { prompt_tokens: response.usage.prompt_tokens }
        : {}),
      ...(response.usage?.completion_tokens !== undefined
        ? { completion_tokens: response.usage.completion_tokens }
        : {}),
      ...(typeof response.usage?.cost === "number"
        ? { cost: response.usage.cost }
        : {}),
    };
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
      if (!Object.hasOwn(context, change.table))
        throw new FinanceApiError(
          "The proposed change is outside this review's selected sections. No changes were made.",
          502,
        );
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
    const answer =
      message.content ||
      (proposals.length
        ? "Review the proposed changes below."
        : "The model returned no answer. Try another model.");
    if (
      snapshot &&
      [...answer.matchAll(/\[(S\d+)\]/g)].some(
        (match) => !snapshot.sources.some((source) => source.ref === match[1]),
      )
    ) {
      throw new FinanceApiError(
        "The model cited a record outside the supplied snapshot. No changes were made; try again.",
        502,
      );
    }
    const evidence = snapshot
      ? {
          sources: snapshot.sources,
          coverage: snapshot.coverage,
          fetched_at: snapshot.fetched_at,
        }
      : {};
    if (
      [...answer.matchAll(/\[(L\d+)\]/g)].some(
        (match) => !logReferences.some((ref) => ref.ref === match[1]),
      )
    )
      throw new FinanceApiError(
        "The model cited an unavailable prior session. No changes were made.",
        502,
      );
    const revision = saved
      ? await saveConversation(
          access,
          body.family_id,
          body.model,
          saved.revision,
          [
            ...history,
            {
              role: "assistant",
              content: answer,
              proposals,
              ...evidence,
              created_at: new Date().toISOString(),
              trace,
              log_references: logReferences,
              ...(body.context ? { review_context: body.context } : {}),
            },
          ],
          scope,
        )
      : undefined;
    return jsonResponse({
      message: answer,
      proposals,
      revision,
      ...evidence,
      log_references: logReferences,
    });
  } catch (e) {
    return apiError(e);
  }
}
