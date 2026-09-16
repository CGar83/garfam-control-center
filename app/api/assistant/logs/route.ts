import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  FinanceApiError,
  jsonResponse,
  readJson,
} from "@/lib/finance/server";
import { logFilename, logUpdateSchema } from "@/lib/assistant/logs";

const querySchema = z.object({
  family_id: z.string().min(1).max(160),
  id: z.string().uuid().optional(),
  search: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(0).max(10000).default(0),
  download: z.enum(["1"]).optional(),
});
const summaryColumns =
  "id,title,model,context_key,message_count,reference_enabled,created_at,updated_at,ended_at";
export async function GET(request: Request) {
  try {
    const input = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const { client, userId } = await authorizeFinance(request, input.family_id);
    if (input.id) {
      const { data, error } = await client
        .from("llm_session_logs")
        .select(`${summaryColumns},memory_note,transcript_md`)
        .eq("family_id", input.family_id)
        .eq("user_id", userId)
        .eq("id", input.id)
        .maybeSingle();
      if (error)
        throw new FinanceApiError(
          "The LLM Log could not be loaded. Check its database migration.",
          503,
        );
      if (!data) throw new FinanceApiError("Log not found.", 404);
      if (input.download)
        return new Response(data.transcript_md, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${logFilename(input.id)}"`,
            "Cache-Control": "no-store, private",
            "X-Content-Type-Options": "nosniff",
          },
        });
      return jsonResponse({ log: data });
    }
    let query = client
      .from("llm_session_logs")
      .select(summaryColumns, { count: "exact" })
      .eq("family_id", input.family_id)
      .eq("user_id", userId);
    if (input.search)
      query = query.textSearch("search_vector", input.search, {
        type: "websearch",
        config: "english",
      });
    const { data, count, error } = await query
      .order("updated_at", { ascending: false })
      .order("id")
      .range(input.page * 25, input.page * 25 + 24);
    if (error)
      throw new FinanceApiError(
        "The LLM Log could not be loaded. Check its database migration.",
        503,
      );
    return jsonResponse({ logs: data ?? [], total: count ?? 0 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = logUpdateSchema.parse(await readJson(request));
    const { client, userId } = await authorizeFinance(request, input.family_id);
    const { data, error } = await client
      .from("llm_session_logs")
      .update({
        title: input.title,
        memory_note: input.memory_note,
        reference_enabled: input.reference_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("family_id", input.family_id)
      .eq("user_id", userId)
      .eq("id", input.id)
      .eq("updated_at", input.updated_at)
      .select("updated_at")
      .maybeSingle();
    if (error)
      throw new FinanceApiError("Log settings could not be saved.", 503);
    if (!data)
      throw new FinanceApiError(
        "This log changed or is no longer available. Reload it before saving.",
        409,
      );
    return jsonResponse(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = z
      .object({ family_id: z.string().min(1).max(160), id: z.string().uuid() })
      .strict()
      .parse(await readJson(request));
    const { client } = await authorizeFinance(request, input.family_id);
    const { error } = await client.rpc("delete_llm_log", {
      target_family: input.family_id,
      target_log: input.id,
    });
    if (error) throw new FinanceApiError("Log could not be deleted.", 503);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
