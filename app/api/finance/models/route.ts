import { z } from "zod";
import {
  apiError,
  authorizeFinance,
  jsonResponse,
  openRouterFetch,
  openRouterKey,
} from "@/lib/finance/server";

export async function GET(request: Request) {
  try {
    const familyId = z
      .string()
      .min(1)
      .max(160)
      .parse(new URL(request.url).searchParams.get("family_id"));
    await authorizeFinance(request, familyId);
    const key = openRouterKey(request, familyId);
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
