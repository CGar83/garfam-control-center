import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export class FinanceApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", Vary: "Authorization" },
  });
}

export function apiError(error: unknown) {
  if (error instanceof FinanceApiError)
    return jsonResponse({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return jsonResponse(
      {
        error: "Some fields are invalid.",
        details: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 5),
      },
      400,
    );
  return jsonResponse(
    { error: "The request could not be completed. Please try again." },
    500,
  );
}

export async function readJson(request: Request, limit = 24000) {
  const reader = request.body?.getReader();
  if (!reader) throw new FinanceApiError("Request body required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new FinanceApiError("Request too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new FinanceApiError("Invalid JSON.");
  }
}

export async function authorizeFinance(request: Request, familyId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new FinanceApiError(
      "Connect Supabase and sign in to use the assistant.",
      503,
    );
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer "))
    throw new FinanceApiError("Sign in to continue.", 401);
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user)
    throw new FinanceApiError("Your session expired. Sign in again.", 401);
  const { data: member, error: memberError } = await client
    .from("family_members")
    .select("id,role")
    .eq("family_id", familyId)
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  if (memberError || !member || !["admin", "parent"].includes(member.role))
    throw new FinanceApiError(
      "A parent or admin account in this workspace is required.",
      403,
    );
  return { client, userId: data.user.id, memberId: member.id as string };
}

export function openRouterKey(request: Request, familyId: string) {
  const supplied = request.headers.get("x-openrouter-key")?.trim();
  const allowedFamilies = (process.env.OPENROUTER_ALLOWED_FAMILY_IDS ?? "")
    .split(",")
    .map((v) => v.trim());
  const key =
    supplied ||
    (allowedFamilies.includes(familyId)
      ? process.env.OPENROUTER_API_KEY
      : undefined);
  if (!key || key.length < 15 || key.length > 512 || /[\r\n]/.test(key))
    throw new FinanceApiError(
      "Enter an OpenRouter key or configure OPENROUTER_API_KEY on the server.",
    );
  return key;
}

export async function openRouterFetch(
  path: "key" | "models" | "chat/completions",
  key: string,
  body?: unknown,
) {
  let response: Response;
  try {
    response = await fetch(`https://openrouter.ai/api/v1/${path}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "Gather Finance",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new FinanceApiError(
      "OpenRouter did not respond in time. Try again.",
      504,
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "OpenRouter rejected this key.",
      402: "Your OpenRouter account needs credits.",
      429: "OpenRouter is busy or your request limit was reached. Try again shortly.",
      400: "The selected model could not process this request. Choose a model that supports tools.",
    };
    throw new FinanceApiError(
      messages[response.status] ??
        "The model provider could not complete the request.",
      502,
    );
  }
  return response.json();
}
