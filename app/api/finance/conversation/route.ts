import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  FinanceApiError,
  jsonResponse,
  readJson,
} from "@/lib/finance/server";
import {
  loadConversation,
  saveConversation,
  storageError,
} from "@/lib/finance/persistence";
import { modelIdSchema } from "@/lib/finance/conversation";
import { assistantContextSchema } from "@/lib/assistant/context";
import { contextKey } from "@/lib/assistant/retrieval";

const querySchema = z.object({
  family_id: z.string().min(1).max(160),
  model: modelIdSchema,
  context: assistantContextSchema.optional(),
});
export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    let context: unknown;
    try {
      context = params.context ? JSON.parse(params.context) : undefined;
    } catch {
      return jsonResponse({ error: "Invalid review context." }, 400);
    }
    const query = querySchema.parse({ ...params, context });
    const access = await authorizeFinance(request, query.family_id);
    const conversation = await loadConversation(
      access,
      query.family_id,
      query.model,
      contextKey(query.context),
    );
    const ids = conversation.messages.flatMap(
      (m) => m.proposals?.map((p) => p.request_id) ?? [],
    );
    let applied: string[] = [];
    if (ids.length) {
      const { data, error } = await access.client
        .from("finance_change_log")
        .select("request_id")
        .eq("family_id", query.family_id)
        .eq("actor_id", access.userId)
        .in("request_id", ids);
      if (error) throw storageError();
      applied = (data ?? []).map((r) => String(r.request_id));
    }
    return jsonResponse({ ...conversation, applied });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = querySchema
      .extend({
        revision: z.number().int().nonnegative(),
        clear: z.literal(true).optional(),
        new_session: z.literal(true).optional(),
      })
      .strict()
      .refine(
        (body) => Boolean(body.clear) !== Boolean(body.new_session),
        "Choose clear or new session.",
      )
      .parse(await readJson(request));
    const access = await authorizeFinance(request, body.family_id);
    let revision: number;
    if (body.new_session) {
      const { data, error } = await access.client.rpc("start_llm_session", {
        target_family: body.family_id,
        target_model: body.model,
        target_context: contextKey(body.context),
        expected_revision: body.revision,
      });
      if (error?.code === "40001")
        throw new FinanceApiError(
          "This conversation changed. Reload it before starting a new session.",
          409,
        );
      if (error) throw storageError();
      revision = Number(data);
    } else
      revision = await saveConversation(
        access,
        body.family_id,
        body.model,
        body.revision,
        [],
        contextKey(body.context),
      );
    return jsonResponse({ revision, messages: [], applied: [] });
  } catch (error) {
    return apiError(error);
  }
}
