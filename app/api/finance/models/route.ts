import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  jsonResponse,
  openRouterFetch,
} from "@/lib/finance/server";
import { resolveOpenRouterKey } from "@/lib/finance/persistence";

export async function GET(request: Request) {
  try {
    const familyId = z
      .string()
      .min(1)
      .max(160)
      .parse(new URL(request.url).searchParams.get("family_id"));
    const access = await authorizeFinance(request, familyId);
    const key = await resolveOpenRouterKey(request, familyId, access);
    // The catalog is public; validate credentials before reporting a connection.
    await openRouterFetch("key", key);
    const body = await openRouterFetch("models", key);
    const parsed = z
      .object({
        data: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            supported_parameters: z.array(z.string()).optional(),
            pricing: z
              .object({ prompt: z.string(), completion: z.string() })
              .optional(),
          }),
        ),
      })
      .parse(body);
    return jsonResponse({
      models: parsed.data
        .filter((m) => m.supported_parameters?.includes("tools"))
        .map((m) => ({ id: m.id, name: m.name, pricing: m.pricing })),
    });
  } catch (e) {
    return apiError(e);
  }
}
