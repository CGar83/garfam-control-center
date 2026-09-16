import { authorizeFinance, FinanceApiError, openRouterKey } from "./server";
import { decryptCredential } from "./credential-crypto";
import { savedMessagesSchema, type SavedFinanceMessage } from "./conversation";

export type FinanceAccess = Awaited<ReturnType<typeof authorizeFinance>>;
export function storageError() {
  return new FinanceApiError(
    "Assistant storage is unavailable. Apply the saved assistant migration and try again.",
    503,
  );
}

export async function loadConnection(access: FinanceAccess, familyId: string) {
  const { data, error } = await access.client
    .from("finance_assistant_connections")
    .select("model,encrypted_api_key")
    .eq("family_id", familyId)
    .eq("user_id", access.userId)
    .maybeSingle();
  if (error) throw storageError();
  return data as { model: string; encrypted_api_key: string | null } | null;
}

export async function resolveOpenRouterKey(
  request: Request,
  familyId: string,
  access: FinanceAccess,
) {
  if (request.headers.get("x-openrouter-key")?.trim())
    return openRouterKey(request, familyId);
  const connection = await loadConnection(access, familyId);
  if (connection?.encrypted_api_key)
    return decryptCredential(
      connection.encrypted_api_key,
      familyId,
      access.userId,
    );
  return openRouterKey(request, familyId);
}

export async function loadConversation(
  access: FinanceAccess,
  familyId: string,
  model: string,
) {
  const { data, error } = await access.client
    .from("finance_assistant_conversations")
    .select("messages,revision")
    .eq("family_id", familyId)
    .eq("user_id", access.userId)
    .eq("model", model)
    .maybeSingle();
  if (error) throw storageError();
  return {
    messages: savedMessagesSchema.parse(data?.messages ?? []),
    revision: Number(data?.revision ?? 0),
  };
}

export async function saveConversation(
  access: FinanceAccess,
  familyId: string,
  model: string,
  revision: number,
  messages: SavedFinanceMessage[],
) {
  const { data, error } = await access.client.rpc("save_finance_conversation", {
    target_family: familyId,
    target_model: model,
    expected_revision: revision,
    new_messages: savedMessagesSchema.parse(messages),
  });
  if (error?.code === "40001")
    throw new FinanceApiError(
      "This conversation changed in another tab. Reload its history before sending again.",
      409,
    );
  if (error) throw storageError();
  return Number(data);
}
