import { useState } from "react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import {
  PageHeader,
  Surface,
  Table,
  Button,
  LoadState,
} from "../components/ui.jsx";
import { ROLES } from "../lib/stages.js";
export default function AdminUsers() {
  const { db, profile } = useAuth(),
    [profiles, reload, loading, error] = useAsync(
      () => db.listProfiles(),
      [db, profile?.id],
    );
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="People and permissions"
        lede="Assign the access each person needs. Pending and inactive accounts cannot open loan records."
      />
      <Surface
        title="Workspace members"
        kicker="Changes take effect after you save the row. LO assistants inherit access from their assigned LO."
      >
        <Table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Assists LO</th>
              <th>Active</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <MemberRow
                key={`${p.id}:${p.role}:${p.branch}:${p.active}:${p.assists_lo_id}`}
                person={p}
                los={profiles.filter((l) => l.role === "LO")}
                db={db}
                onSave={reload}
              />
            ))}
          </tbody>
        </Table>
      </Surface>
    </>
  );
}
function MemberRow({ person, los, db, onSave }) {
  const [patch, setPatch] = useState({
      role: person.role,
      branch: person.branch || "",
      assists_lo_id: person.assists_lo_id || null,
      active: person.active !== false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const changed =
    patch.role !== person.role ||
    patch.branch !== (person.branch || "") ||
    patch.assists_lo_id !== (person.assists_lo_id || null) ||
    patch.active !== (person.active !== false);
  const edit = (p) => {
    setPatch((v) => ({ ...v, ...p }));
    setError("");
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await db.updateProfile(person.id, patch);
      await onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr>
      <td>
        <strong>{person.full_name}</strong>
        <div className="small muted">{person.email}</div>
      </td>
      <td>
        <select
          disabled={busy}
          className="sel"
          aria-label={`Role for ${person.full_name}`}
          style={{ width: 140 }}
          value={patch.role}
          onChange={(e) =>
            edit({
              role: e.target.value,
              assists_lo_id:
                e.target.value === "LOA" ? patch.assists_lo_id : null,
            })
          }
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          disabled={busy}
          className="inp"
          aria-label={`Branch for ${person.full_name}`}
          style={{ width: 130 }}
          value={patch.branch}
          onChange={(e) => edit({ branch: e.target.value })}
        />
      </td>
      <td>
        {patch.role === "LOA" ? (
          <select
            disabled={busy}
            className="sel"
            aria-label={`Loan officer for ${person.full_name}`}
            value={patch.assists_lo_id || ""}
            onChange={(e) => edit({ assists_lo_id: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {los.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">Not applicable</span>
        )}
      </td>
      <td>
        <input
          type="checkbox"
          disabled={busy}
          checked={patch.active}
          onChange={(e) => edit({ active: e.target.checked })}
          aria-label={`Active: ${person.full_name}`}
        />
      </td>
      <td>
        <Button size="sm" disabled={busy || !changed} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
