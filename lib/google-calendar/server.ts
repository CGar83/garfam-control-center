import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { OAuth2Client } from "google-auth-library";
import { FinanceApiError } from "../finance/server";

export function configuration() {
  const required = [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_ENCRYPTION_KEY",
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ];
  return required.filter((name) => !process.env[name]);
}
export function adminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new FinanceApiError(
      "Google Calendar server storage is not configured.",
      503,
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function redirectUri() {
  const value = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!value)
    throw new FinanceApiError("Google Calendar setup is incomplete.", 503);
  const url = new URL(value);
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )) ||
    url.pathname !== "/api/calendar/google/callback" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new FinanceApiError(
      "Invalid Google Calendar callback configuration.",
      503,
    );
  return url.toString();
}
export function oauthClient() {
  if (configuration().length)
    throw new FinanceApiError(
      "Google Calendar setup is incomplete. Open the setup guide.",
      503,
    );
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: redirectUri(),
    transporterOptions: { timeout: 6000 },
  });
}
function key() {
  const value = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new FinanceApiError(
      "Google Calendar encrypted storage is not configured.",
      503,
    );
  return Buffer.from(value, "hex");
}
export function seal(value: string, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const result = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    result.toString("hex"),
  ].join(".");
}
export function unseal(value: string, context: string) {
  try {
    const [iv, tag, body, extra] = value.split(".");
    if (
      extra ||
      !/^[a-f0-9]{24}$/.test(iv) ||
      !/^[a-f0-9]{32}$/.test(tag) ||
      !/^(?:[a-f0-9]{2})+$/.test(body)
    )
      throw Error();
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "hex"),
    );
    cipher.setAAD(Buffer.from(context));
    cipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([
      cipher.update(Buffer.from(body, "hex")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new FinanceApiError("Google Calendar needs to be reconnected.", 503);
  }
}
export class GoogleError extends Error {
  constructor(public status: number) {
    super(`Google Calendar request failed (${status}).`);
  }
}
export async function tokenFor(link: {
  family_id: string;
  user_id: string;
  encrypted_refresh_token: string;
}) {
  const oauth = oauthClient();
  oauth.setCredentials({
    refresh_token: unseal(
      link.encrypted_refresh_token,
      `${link.family_id}:${link.user_id}`,
    ),
  });
  try {
    const result = await oauth.getAccessToken();
    if (!result.token) throw Error();
    return result.token;
  } catch {
    throw new GoogleError(401);
  }
}
export async function googleRequest(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  let response: Response;
  try {
    response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new GoogleError(504);
  }
  if (!response.ok) throw new GoogleError(response.status);
  if (response.status === 204) return null;
  const text = await response.text();
  if (text.length > 2_000_000) throw new GoogleError(413);
  return JSON.parse(text);
}
export function dbResult(error: unknown) {
  if (error)
    throw new FinanceApiError(
      "Calendar sync storage is unavailable. Check the database migration.",
      503,
    );
}
