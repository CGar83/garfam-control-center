import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { verifyLlmLogs } from "./verify-llm-logs";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users
        select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
        from generate_series(1,5) n;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.families(id text primary key);
      create table public.family_members(id text primary key, family_id text references families(id), user_id text, role text, blocked_sections text[] default '{}', created_at timestamptz default now());
      create table public.credit_cards(id text primary key, family_id text, apr numeric not null);
      create function public.user_family_role(target_family_id text) returns text language sql stable security definer set search_path = public as $$
        select role from family_members where family_id = target_family_id and user_id = auth.uid()::text limit 1
      $$;
      create function public.can_access_section(target_family_id text, section_name text) returns boolean language sql stable security definer set search_path = public as $$
        select exists(select 1 from family_members where family_id = target_family_id and user_id = auth.uid()::text and (role in ('admin','parent') or not (section_name = any(blocked_sections))))
      $$;
      create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = clock_timestamp(); return new; end $$;
      insert into families values ('family-a'),('family-b');
      insert into family_members(id,family_id,user_id,role,blocked_sections) values
        ('parent-a','family-a','00000000-0000-4000-8000-000000000001','parent','{}'),
        ('parent-b','family-b','00000000-0000-4000-8000-000000000002','parent','{}'),
        ('child-a','family-a','00000000-0000-4000-8000-000000000003','viewer','{finances}'),
        ('viewer-a','family-a','00000000-0000-4000-8000-000000000004','viewer','{}');
      alter table families enable row level security;
      alter table family_members enable row level security;
      grant select,insert on families,family_members to authenticated;
      create policy families_insert on families for insert to authenticated with check (true);
      create policy family_members_insert on family_members for insert to authenticated with check (user_id = auth.uid()::text or user_family_role(family_id) = 'admin');
    `);
    await db.exec(
      await readFile(
        "supabase/migrations/20260915232546_finance_recovery_hub.sql",
        "utf8",
      ),
    );
    await db.exec(
      "set role authenticated; set test.user_id = '00000000-0000-4000-8000-000000000001';",
    );
    await assert.rejects(
      db.exec(
        "insert into family_members(id,family_id,user_id,role) values ('intruder','family-b',auth.uid()::text,'admin')",
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        "insert into families(id,created_by_user_id) values ('spoofed','00000000-0000-4000-8000-000000000002')",
      ),
      /row-level security/,
    );
    await db.exec("insert into families(id) values ('new-workspace')");
    await db.exec("set test.user_id = '00000000-0000-4000-8000-000000000002'");
    await assert.rejects(
      db.exec(
        "insert into family_members(id,family_id,user_id,role) values ('stolen','new-workspace',auth.uid()::text,'admin')",
      ),
      /row-level security/,
    );
    await db.exec("set test.user_id = '00000000-0000-4000-8000-000000000001'");
    await db.exec(
      "insert into family_members(id,family_id,user_id,role) values ('owner','new-workspace',auth.uid()::text,'admin')",
    );
    await db.exec(
      "insert into family_members(id,family_id,user_id,role) values ('invited','new-workspace','00000000-0000-4000-8000-000000000002','parent')",
    );
    const payload = {
      title: "Review minimums",
      phase: "today",
      priority: "high",
      status: "not_started",
      due_date: null,
    };
    const call = (
      family: string,
      request: string,
      operation = "create",
      values: unknown = payload,
      expected: string | null = null,
      table = "finance_actions",
    ) =>
      db.query<{ result: Record<string, unknown> }>(
        "select public.apply_finance_change($1,$2,$3,'action-1',$4,$5,$6::jsonb) as result",
        [family, request, table, operation, expected, JSON.stringify(values)],
      );
    const request = "00000000-0000-4000-8000-000000000011";
    const first = (await call("family-a", request)).rows[0].result;
    assert.equal(first.title, "Review minimums");
    assert.equal(first.family_id, "family-a");
    assert.deepEqual(
      (await call("family-a", request)).rows[0].result,
      first,
      "Retries must return the original result",
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from finance_change_log",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      call("family-b", "00000000-0000-4000-8000-000000000012"),
      /Parent access required/,
    );
    await assert.rejects(
      call(
        "family-a",
        "00000000-0000-4000-8000-000000000013",
        "update",
        { status: "done" },
        "2000-01-01T00:00:00Z",
      ),
      /changed since review/,
    );
    await assert.rejects(
      call(
        "family-a",
        "00000000-0000-4000-8000-000000000014",
        "update",
        { family_id: "family-b" },
        String(first.updated_at),
      ),
      /Unsupported field/,
    );
    await assert.rejects(
      call(
        "family-a",
        "00000000-0000-4000-8000-000000000015",
        "create",
        payload,
        null,
        "family_members",
      ),
      /Unsupported change/,
    );
    const updated = (
      await call(
        "family-a",
        "00000000-0000-4000-8000-000000000016",
        "update",
        { status: "done" },
        String(first.updated_at),
      )
    ).rows[0].result;
    assert.equal(updated.status, "done");
    assert.notEqual(updated.updated_at, first.updated_at);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from finance_change_log",
        )
      ).rows[0].n,
      2,
      "Failed writes must not create receipts",
    );
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            "select claim_finance_assistant_request('family-a') allowed",
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select claim_finance_assistant_request('family-a') allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await assert.rejects(
      db.exec("delete from finance_assistant_limits"),
      /permission denied/,
    );

    await db.exec("set test.user_id = '00000000-0000-4000-8000-000000000003'");
    assert.equal(
      (await db.query("select * from finance_actions")).rows.length,
      0,
      "Blocked viewer cannot read finance actions",
    );
    await assert.rejects(
      call("family-a", "00000000-0000-4000-8000-000000000017"),
      /Parent access required/,
    );
    await db.exec("set test.user_id = '00000000-0000-4000-8000-000000000004'");
    assert.equal(
      (await db.query("select * from finance_actions")).rows.length,
      1,
      "Allowed viewer can read",
    );
    await assert
      .rejects(
        db.exec("update finance_actions set status='not_started'"),
        /permission denied|row-level security/,
      )
      .catch(async () => {
        // UPDATE with RLS may silently match zero rows instead of throwing.
        assert.equal(
          (
            await db.query<{ status: string }>(
              "select status from finance_actions",
            )
          ).rows[0].status,
          "done",
        );
      });
    await db.exec("set test.user_id = '00000000-0000-4000-8000-000000000002'");
    assert.equal(
      (await db.query("select * from finance_actions")).rows.length,
      0,
      "Other-family parent cannot read",
    );
    assert.equal(
      (await db.query("select * from finance_change_log")).rows.length,
      0,
      "Other-family parent cannot read receipts",
    );
    await db.exec("reset role");
    await db.exec(
      await readFile(
        "supabase/migrations/20260916010000_saved_finance_assistant.sql",
        "utf8",
      ),
    );
    await db.exec(
      "insert into family_members(id,family_id,user_id,role) values ('other-admin','family-a','00000000-0000-4000-8000-000000000005','admin')",
    );
    await db.exec(
      "set role authenticated; set test.user_id = '00000000-0000-4000-8000-000000000001'",
    );
    await db.exec(
      "insert into finance_assistant_connections(family_id,user_id,model,encrypted_api_key) values ('family-a',auth.uid(),'test/model','v1.encrypted-placeholder')",
    );
    const saveChat = (
      model: string,
      revision: number,
      messages: unknown[] = [{ role: "user", content: "Review my plan" }],
      family = "family-a",
    ) =>
      db.query<{ revision: number }>(
        "select save_finance_conversation($1,$2,$3,$4::jsonb) revision",
        [family, model, revision, JSON.stringify(messages)],
      );
    assert.equal((await saveChat("test/model", 0)).rows[0].revision, 1);
    assert.equal((await saveChat("test/other-model", 0)).rows[0].revision, 1);
    await db.exec("reset role");
    await db.exec(
      await readFile(
        "supabase/migrations/20260916050946_workspace_assistant_context.sql",
        "utf8",
      ),
    );
    await db.exec(
      "grant execute on function public.save_workspace_conversation(text,text,text,integer,jsonb), public.save_finance_conversation(text,text,integer,jsonb) to anon",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20260916052208_workspace_assistant_function_grants.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon','public.save_workspace_conversation(text,text,text,integer,jsonb)','execute') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon','public.save_finance_conversation(text,text,integer,jsonb)','execute') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec("set role authenticated");
    const scopedChat = (
      scope: string,
      revision: number,
      messages: unknown[] = [{ role: "user", content: "Scoped review" }],
    ) =>
      db.query<{ revision: number }>(
        "select save_workspace_conversation('family-a','test/model',$1,$2,$3::jsonb) revision",
        [scope, revision, JSON.stringify(messages)],
      );
    assert.equal((await scopedChat("health", 0)).rows[0].revision, 1);
    assert.equal((await scopedChat("calendar", 0)).rows[0].revision, 1);
    assert.equal((await scopedChat("health", 1, [])).rows[0].revision, 2);
    await assert.rejects(scopedChat("health", 1), /Conversation changed/);
    assert.equal(
      (
        await db.query(
          "select * from finance_assistant_conversations where context_key='calendar' and revision=1",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select * from finance_assistant_conversations where context_key='finance' and revision=1",
        )
      ).rows.length,
      2,
    );
    await assert.rejects(saveChat("test/model", 0), /Conversation changed/);
    await assert.rejects(
      saveChat(
        "test/model",
        1,
        Array(101).fill({ role: "user", content: "x" }),
      ),
      /check constraint/,
    );
    assert.equal((await saveChat("test/model", 1, [])).rows[0].revision, 2);
    await assert.rejects(
      saveChat("test/model", 1),
      /Conversation changed/,
      "An in-flight reply must not restore cleared history",
    );
    assert.equal(
      (
        await db.query(
          "select * from finance_assistant_conversations where model='test/other-model'",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      saveChat("test/model", 0, [], "family-b"),
      /Parent access required/,
    );
    await assert.rejects(
      db.exec(
        "update finance_assistant_connections set user_id='00000000-0000-4000-8000-000000000005'",
      ),
      /row-level security/,
    );
    for (const user of [
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000005",
    ]) {
      await db.exec(`set test.user_id = '${user}'`);
      assert.equal(
        (await db.query("select * from finance_assistant_connections")).rows
          .length,
        0,
      );
      assert.equal(
        (await db.query("select * from finance_assistant_conversations")).rows
          .length,
        0,
      );
      await assert.rejects(
        db.exec(
          "insert into finance_assistant_connections(family_id,user_id,model) values ('family-a','00000000-0000-4000-8000-000000000001','test/spoof')",
        ),
        /row-level security/,
      );
      await db.exec("delete from finance_assistant_conversations");
    }
    await db.exec(
      "reset role; update family_members set role='viewer' where id='parent-a'; set role authenticated; set test.user_id='00000000-0000-4000-8000-000000000001'",
    );
    assert.equal(
      (await db.query("select * from finance_assistant_connections")).rows
        .length,
      0,
    );
    await assert.rejects(saveChat("test/model", 2), /Parent access required/);
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from finance_assistant_connections"),
      /permission denied/,
    );
    await assert.rejects(saveChat("test/model", 2), /permission denied/);
    await db.exec("reset role");
    await verifyLlmLogs(db);
    assert.equal(
      (await db.query("select * from finance_assistant_conversations")).rows
        .length,
      4,
    );
    await db.exec(
      "delete from auth.users where id='00000000-0000-4000-8000-000000000001'",
    );
    assert.equal(
      (await db.query("select * from llm_session_logs")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from finance_assistant_connections")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from finance_assistant_conversations")).rows
        .length,
      0,
    );
    console.log(
      "Assistant storage checks passed: owner and workspace isolation, admin privacy, viewer/anon rejection, demotion, model separation, history limits, concurrent/cleared conversation conflicts, and user deletion cleanup.",
    );
    console.log(
      "Finance database checks passed: migration, creator-only workspace bootstrap, RLS, family isolation, replay protection, conflicts, atomic receipts, request limits.",
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
