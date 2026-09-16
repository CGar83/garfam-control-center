import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";

export async function verifyLlmLogs(db: PGlite) {
  await db.exec(
    await readFile(
      "supabase/migrations/20260916053223_private_llm_session_logs.sql",
      "utf8",
    ),
  );
  const backfill = await db.query<{ transcript_md: string }>(
    "select transcript_md from llm_session_logs",
  );
  assert.ok(
    backfill.rows.length > 0,
    "Existing retained chats must become Markdown logs",
  );
  assert.match(backfill.rows[0].transcript_md, /# Gather LLM Log/);
  await db.exec(
    "update family_members set role='parent' where id='parent-a'; set role authenticated; set test.user_id='00000000-0000-4000-8000-000000000001'",
  );
  const get = () =>
    db.query<{ session_id: string; revision: number }>(
      "select session_id,revision from finance_assistant_conversations where family_id='family-a' and model='test/model' and context_key='finance'",
    );
  const before = (await get()).rows[0];
  const messages = [
    { role: "user", content: "Review mortgage plan" },
    {
      role: "assistant",
      content: "Keep the emergency reserve. <script>untrusted</script>",
      created_at: "2026-09-16T00:00:00.000Z",
      trace: { prompt_tokens: 100, completion_tokens: 20 },
    },
  ];
  await db.query(
    "select save_finance_conversation('family-a','test/model',$1,$2::jsonb)",
    [before.revision, JSON.stringify(messages)],
  );
  const log = (
    await db.query<{
      id: string;
      transcript_md: string;
      message_count: number;
    }>(
      "select id,transcript_md,message_count from llm_session_logs where id=$1",
      [before.session_id],
    )
  ).rows[0];
  assert.equal(log.message_count, 2);
  assert.match(log.transcript_md, /Review mortgage plan/);
  assert.match(log.transcript_md, /Keep the emergency reserve/);
  assert.match(log.transcript_md, /prompt_tokens/);
  assert.equal(
    (
      await db.query(
        "select * from find_llm_references('family-a','test/model','finance','mortgage')",
      )
    ).rows.length,
    0,
    "Current session is not prior memory",
  );
  await db.query(
    "select start_llm_session('family-a','test/model','finance',$1)",
    [before.revision + 1],
  );
  const after = (await get()).rows[0];
  assert.notEqual(after.session_id, before.session_id);
  const refs = await db.query<{ id: string; excerpt: string }>(
    "select * from find_llm_references('family-a','test/model','finance','mortgage')",
  );
  assert.equal(refs.rows[0].id, before.session_id);
  assert.ok(refs.rows[0].excerpt.length <= 1800);
  assert.equal(
    (
      await db.query(
        "select * from find_llm_references('family-a','test/model','health','mortgage')",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select * from find_llm_references('family-a','test/other-model','finance','mortgage')",
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update llm_session_logs set reference_enabled=false where id=$1",
    [before.session_id],
  );
  assert.equal(
    (
      await db.query(
        "select * from find_llm_references('family-a','test/model','finance','mortgage')",
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update llm_session_logs set reference_enabled=true,memory_note='Owner correction: keep reserve' where id=$1",
    [before.session_id],
  );
  assert.match(
    (
      await db.query<{ excerpt: string }>(
        "select * from find_llm_references('family-a','test/model','finance','mortgage')",
      )
    ).rows[0].excerpt,
    /Owner correction/,
  );
  await assert.rejects(
    db.query(
      "select save_finance_conversation('family-a','test/model',$1,$2::jsonb)",
      [before.revision + 1, JSON.stringify(messages)],
    ),
    /Conversation changed/,
  );
  for (const user of [
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000005",
  ]) {
    await db.exec(`set test.user_id='${user}'`);
    assert.equal(
      (await db.query("select * from llm_session_logs")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from find_llm_references('family-a','test/model','finance','mortgage')",
        )
      ).rows.length,
      0,
    );
  }
  await db.exec("reset role; set role anon");
  await assert.rejects(
    db.exec("select * from llm_session_logs"),
    /permission denied/,
  );
  await assert.rejects(
    db.exec(
      "select * from find_llm_references('family-a','test/model','finance','mortgage')",
    ),
    /permission denied/,
  );
  await db.exec(
    "reset role; set role authenticated; set test.user_id='00000000-0000-4000-8000-000000000001'",
  );
  await db.query(
    "select save_finance_conversation('family-a','test/model',$1,$2::jsonb)",
    [after.revision, JSON.stringify(messages)],
  );
  await db.query("select delete_llm_log('family-a',$1::uuid)", [
    after.session_id,
  ]);
  assert.equal(
    (
      await db.query("select * from llm_session_logs where id=$1", [
        after.session_id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "select save_finance_conversation('family-a','test/model',$1,$2::jsonb)",
      [after.revision + 1, JSON.stringify(messages)],
    ),
    /Conversation changed/,
    "Deleting current log must block in-flight resurrection",
  );
  assert.equal(
    (
      await db.query("select * from llm_session_logs where id=$1", [
        before.session_id,
      ])
    ).rows.length,
    1,
    "Deleting current log must preserve other archives",
  );
  await db.exec("reset role");
  console.log(
    "LLM Log database checks passed: backfill, complete Markdown, atomic saves, new-session archive, bounded references, exclusion, model/scope/owner isolation, anonymous rejection, deletion and stale-write protection.",
  );
}
