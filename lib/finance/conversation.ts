import { z } from "zod";
import { proposalSchema } from "./assistant";

export const modelIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_./:@-]+$/);
export const savedMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20000),
    proposals: z.array(proposalSchema).max(5).optional(),
  })
  .strict();
export type SavedFinanceMessage = z.infer<typeof savedMessageSchema>;
export const savedMessagesSchema = z.array(savedMessageSchema).max(100);

// Bound inference cost independently of retained history. Never send proposals as instructions.
export function conversationContext(messages: SavedFinanceMessage[]) {
  const result: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = 18000;
  for (const message of messages.slice(-11).reverse()) {
    if (!remaining) break;
    const content = message.content.slice(0, Math.min(6000, remaining));
    result.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return result;
}
