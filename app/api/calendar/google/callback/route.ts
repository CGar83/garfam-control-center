import { NextResponse } from "next/server";
import {
  adminClient,
  dbResult,
  oauthClient,
  redirectUri,
  seal,
  unseal,
} from "@/lib/google-calendar/server";
import { digest, scopes } from "@/lib/google-calendar/core";

export const runtime = "nodejs";
export async function GET(request: Request) {
  let origin: string;
  try {
    origin = new URL(redirectUri()).origin;
  } catch {
    return new Response("Google Calendar callback is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let success = false;
  try {
    const params = new URL(request.url).searchParams;
    const state = params.get("state") ?? "",
      code = params.get("code") ?? "";
    const cookie =
      (request.headers.get("cookie") ?? "")
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("gather_google_oauth="))
        ?.slice("gather_google_oauth=".length) ?? "";
    if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie))
      throw Error();
    const db = adminClient(),
      consumed = await db.rpc("consume_google_calendar_state", {
        state_digest: digest(state),
        cookie_digest: digest(cookie),
      });
    dbResult(consumed.error);
    const handshake = consumed.data?.[0];
    if (!handshake || params.has("error") || !code || code.length > 5000)
      throw Error();
    const member = await db
      .from("family_members")
      .select("id")
      .eq("family_id", handshake.family_id)
      .eq("user_id", handshake.user_id)
      .in("role", ["admin", "parent"])
      .limit(1)
      .maybeSingle();
    dbResult(member.error);
    if (!member.data) throw Error();
    const oauth = oauthClient();
    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: unseal(
        handshake.encrypted_verifier,
        `oauth:${handshake.family_id}:${handshake.user_id}`,
      ),
      redirect_uri: redirectUri(),
    });
    const granted = (tokens.scope ?? "").split(" ");
    if (
      !tokens.refresh_token ||
      !scopes.every(
        (scope) =>
          granted.includes(scope) ||
          granted.includes("https://www.googleapis.com/auth/calendar"),
      )
    )
      throw Error();
    const previous = await db
      .from("google_calendar_links")
      .select("id,user_id")
      .eq("family_id", handshake.family_id)
      .maybeSingle();
    dbResult(previous.error);
    const values = {
      family_id: handshake.family_id,
      user_id: handshake.user_id,
      encrypted_refresh_token: seal(
        tokens.refresh_token,
        `${handshake.family_id}:${handshake.user_id}`,
      ),
      status: "choose_calendar",
      error_code: null,
    };
    if (previous.data) {
      if (previous.data.user_id !== handshake.user_id) throw Error();
      const result = await db
        .from("google_calendar_links")
        .update(values)
        .eq("id", previous.data.id)
        .or(`lock_until.is.null,lock_until.lt.${new Date().toISOString()}`)
        .select("id");
      dbResult(result.error);
      if (!result.data?.length) throw Error();
    } else {
      const result = await db.from("google_calendar_links").insert(values);
      dbResult(result.error);
    }
    success = true;
  } catch {
    /* Do not expose OAuth codes, token responses, or upstream error details. */
  }
  const response = NextResponse.redirect(
    `${origin}/calendar?${success ? "google_connected=1" : "google_error=authorization_failed"}`,
  );
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Set-Cookie",
    `gather_google_oauth=; HttpOnly; SameSite=Lax; Path=/api/calendar/google/callback; Max-Age=0${origin.startsWith("https:") ? "; Secure" : ""}`,
  );
  return response;
}
