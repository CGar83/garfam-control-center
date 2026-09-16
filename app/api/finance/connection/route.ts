import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  jsonResponse,
  openRouterFetch,
  readJson,
} from "@/lib/finance/server";
import {
  canSaveCredentials,
  encryptCredential,
} from "@/lib/finance/credential-crypto";
import { loadConnection, storageError } from "@/lib/finance/persistence";
import { modelIdSchema } from "@/lib/finance/conversation";

const familySchema = z.string().min(1).max(160);
const bodySchema = z
  .object({
    family_id: familySchema,
    model: modelIdSchema,
    api_key: z
      .string()
      .trim()
      .min(15)
      .max(512)
      .regex(/^[^\s]+$/)
      .optional(),
    forget_key: z.boolean().optional(),
  })
  .strict()
  .refine(
    (b) => !(b.api_key && b.forget_key),
    "Choose save or forget, not both.",
  );

export async function GET(request: Request) {
  try {
    const familyId = familySchema.parse(
      new URL(request.url).searchParams.get("family_id"),
    );
    const access = await authorizeFinance(request, familyId);
    const connection = await loadConnection(access, familyId);
    return jsonResponse({
      model: connection?.model ?? "",
      has_saved_key: !!connection?.encrypted_api_key,
      can_save_key: canSaveCredentials(),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const access = await authorizeFinance(request, body.family_id);
    let encrypted: string | null | undefined;
    if (body.api_key) {
      encrypted = encryptCredential(
        body.api_key,
        body.family_id,
        access.userId,
      );
      await openRouterFetch("key", body.api_key);
    } else if (body.forget_key) encrypted = null;
    const { error } = await access.client
      .from("finance_assistant_connections")
      .upsert(
        {
          family_id: body.family_id,
          user_id: access.userId,
          model: body.model,
          ...(encrypted !== undefined ? { encrypted_api_key: encrypted } : {}),
        },
        { onConflict: "family_id,user_id" },
      );
    if (error) throw storageError();
    return jsonResponse({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
