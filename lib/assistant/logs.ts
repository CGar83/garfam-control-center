import { z } from "zod";

export const logReferenceSchema = z.object({
  ref: z.string().regex(/^L[1-3]$/),
  id: z.string().uuid(),
  title: z.string().max(200),
  excerpt: z.string().max(1800),
  updated_at: z.string().datetime({ offset: true }),
  matched: z.boolean(),
});
export type LogReference = z.infer<typeof logReferenceSchema>;
export const logUpdateSchema = z
  .object({
    family_id: z.string().min(1).max(160),
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    memory_note: z.string().trim().max(2000),
    reference_enabled: z.boolean(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();
export interface LlmLogSummary {
  id: string;
  title: string;
  model: string;
  context_key: string;
  message_count: number;
  reference_enabled: boolean;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}
export interface LlmLogDetail extends LlmLogSummary {
  memory_note: string;
  transcript_md: string;
}

export function logFilename(id: string) {
  return `llm-${z.string().uuid().parse(id)}.md`;
}
