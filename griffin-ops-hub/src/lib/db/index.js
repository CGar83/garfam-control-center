// One interface, two implementations. Pages never import supabase-js directly.
//
// interface Db {
//   mode: 'local' | 'supabase'
//   auth: { getSession, signInWithGoogle, signOut, onChange, listDemoUsers?, switchDemoUser? }
//   getProfile(), listProfiles(), updateProfile(id, patch)
//   getInvestorData()            -> { PR, CFG, byId }
//   getSchema(formType, version?, baseVersion?)          -> merged schema with version
//   findLoan(loanNumber), listLoans(), upsertLoan(loan)
//   capabilities: { loanCoordination, loanEvents }
//   setLoanCoordination(loanNumber, { hubPhase?, observedLosStatus?, note? })  -> human-set context, never a LOS milestone
//   listLoanEvents(loanNumber)    -> every operations event recorded against the loan
//   listWorksheets({ stages?, loanNumber?, mine? }), getWorksheet(id)
//   createWorksheet({ loanNumber, formType, borrowerLast, data })
//   saveWorksheet(id, { data, expectedUpdatedAt? })
//   setVerified(id, key, verified, { expectedUpdatedAt? }?)
//   transition(id, toStage, note, { expectedUpdatedAt? }?)
//   getActivity(id)              -> { events, transitions }
//   listWorkItems({ loanNumber? }?), getWorkItem(id)
//   createWorkItem({ loanNumber, borrowerLast, templateId, department?, title?, priority?, dueDate?, ownerId?, data? })
//   Department is creation-only and must be allowed by the published template.
//   saveWorkItem(id, { data?, checks?, ownerId?, dueDate?, priority?, title?, expectedUpdatedAt })
//   transitionWorkItem(id, status, note, { expectedUpdatedAt })
//   logWorkTime(id, { minutes, note, expectedUpdatedAt })
//   getWorkActivity(id)           -> { events, timeEntries }
//   loadDemoOperations?()         -> explicit synthetic fixtures, local only
//   reports()                    -> { aging, loQuality, mlpVerification, lockToStp }
// }

import { createLocalDb } from "./local.js";
import { createSupabaseDb } from "./supabase.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (Boolean(url) !== Boolean(key))
  throw new Error(
    "Supabase configuration is incomplete. Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
  );

export const db = url && key ? createSupabaseDb(url, key) : createLocalDb();

export function uid() {
  return (
    (crypto.randomUUID && crypto.randomUUID()) ||
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

export function nowIso() {
  return new Date().toISOString();
}
