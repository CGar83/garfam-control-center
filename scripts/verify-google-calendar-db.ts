import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);create table public.families(id text primary key); create table public.events(id text primary key);
    insert into auth.users values ('00000000-0000-4000-8000-000000000001');insert into public.families values ('family-a'),('family-b');`);
    await db.exec(
      await readFile(
        "supabase/migrations/20261110143023_google_calendar_two_way_sync.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261110150000_calendar_events_realtime.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query<{ relreplident: string }>(
          "select relreplident from pg_class where relname='events'",
        )
      ).rows[0].relreplident,
      "f",
    );
    const lease = "00000000-0000-4000-8000-000000000011",
      other = "00000000-0000-4000-8000-000000000012";
    await db.exec(
      `set role service_role; insert into public.google_calendar_links(id,family_id,user_id,encrypted_refresh_token,calendar_id,status) values ('00000000-0000-4000-8000-000000000010','family-a','00000000-0000-4000-8000-000000000001','encrypted-test','calendar-a','ready');`,
    );
    const id = "00000000-0000-4000-8000-000000000010";
    const first = await db.query(
      "select * from public.claim_google_calendar_sync($1,$2)",
      [id, lease],
    );
    assert.equal(first.rows.length, 1);
    assert.equal(
      (
        await db.query(
          "select * from public.claim_google_calendar_sync($1,$2)",
          [id, other],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.google_calendar_links where id=$1 and (lock_until is null or lock_until<clock_timestamp()) returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    await db.query(
      "update public.google_calendar_links set lock_until=clock_timestamp()-interval '1 second' where id=$1",
      [id],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.claim_google_calendar_sync($1,$2)",
          [id, other],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.google_calendar_links set status='paused' where id=$1 and lock_id=$2 returning id",
          [id, lease],
        )
      ).rows.length,
      0,
    );
    await db.exec(
      `insert into public.google_calendar_oauth_states values ('state-a','cookie-a','family-a','00000000-0000-4000-8000-000000000001','test-verifier',clock_timestamp()+interval '5 minutes');`,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.consume_google_calendar_state('state-a','wrong')",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.consume_google_calendar_state('state-a','cookie-a')",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.consume_google_calendar_state('state-a','cookie-a')",
        )
      ).rows.length,
      0,
    );
    await db.exec(
      `insert into public.google_calendar_oauth_states values ('expired','cookie-a','family-a','00000000-0000-4000-8000-000000000001','test-verifier',clock_timestamp()-interval '1 second');`,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.consume_google_calendar_state('expired','cookie-a')",
        )
      ).rows.length,
      0,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role;set role ${role}`);
      for (const table of [
        "google_calendar_links",
        "google_calendar_event_maps",
        "google_calendar_oauth_states",
      ])
        await assert.rejects(
          db.query(`select * from public.${table}`),
          /permission denied/,
        );
      await assert.rejects(
        db.query("select * from public.claim_google_calendar_sync($1,$2)", [
          id,
          lease,
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "select * from public.consume_google_calendar_state('expired','cookie-a')",
        ),
        /permission denied/,
      );
    }
    await db.exec(`reset role;delete from public.families where id='family-a'`);
    assert.equal(
      (await db.query("select * from public.google_calendar_links")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.google_calendar_oauth_states")).rows
        .length,
      0,
    );
    console.log(
      "Google Calendar database checks passed: service-only credentials, anonymous/viewer isolation, OAuth replay/expiry, exclusive leases, stale-writer fencing, busy disconnect and workspace deletion.",
    );
  } finally {
    await db.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
