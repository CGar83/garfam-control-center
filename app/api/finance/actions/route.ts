import { z } from "zod";
import { proposalSchema, validateFinanceValues } from "@/lib/finance/assistant";
import {
  apiError,
  authorizeFinance,
  FinanceApiError,
  jsonResponse,
  readJson,
} from "@/lib/finance/server";

const bodySchema = z
  .object({ family_id: z.string().min(1).max(160), proposal: proposalSchema })
  .strict();

export async function POST(request: Request) {
  try {
    const { family_id, proposal } = bodySchema.parse(await readJson(request));
    const { client } = await authorizeFinance(request, family_id);
    const values = validateFinanceValues(
      proposal.table,
      proposal.operation,
      proposal.values,
    );
    const { data, error } = await client.rpc("apply_finance_change", {
      target_family: family_id,
      request_id: proposal.request_id,
      target_table: proposal.table,
      target_id: proposal.record_id,
      operation: proposal.operation,
      expected_updated_at: proposal.expected_updated_at,
      payload: values,
    });
    if (error) {
      if (error.code === "40001")
        throw new FinanceApiError(
          "This record changed after the proposal. Ask for a fresh proposal.",
          409,
        );
      if (error.code === "P0002")
        throw new FinanceApiError(
          "The record no longer exists in this workspace.",
          404,
        );
      throw new FinanceApiError(
        "Could not save the change. Check workspace access and apply the finance migration.",
        400,
      );
    }
    return jsonResponse({ table: proposal.table, record: data });
  } catch (e) {
    return apiError(e);
  }
}
