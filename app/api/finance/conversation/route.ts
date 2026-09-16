import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  jsonResponse,
  readJson,
} from "@/lib/finance/server";
import {
  loadConversation,
  saveConversation,
  storageError,
} from "@/lib/finance/persistence";
import { modelIdSchema } from "@/lib/finance/conversation";

const querySchema = z.object({
  family_id: z.string().min(1).max(160),
  model: modelIdSchema,
});
export async function GET(request: Request) {
  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const access = await authorizeFinance(request, query.family_id);
    const conversation = await loadConversation(
      access,
      query.family_id,
      query.model,
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
        clear: z.literal(true),
      })
      .strict()
      .parse(await readJson(request));
    const access = await authorizeFinance(request, body.family_id);
    const revision = await saveConversation(
      access,
      body.family_id,
      body.model,
      body.revision,
      [],
    );
    return jsonResponse({ revision, messages: [], applied: [] });
  } catch (error) {
    return apiError(error);
  }
}
