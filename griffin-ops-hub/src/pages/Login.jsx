import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { Button, Callout } from "../components/ui.jsx";

export default function Login() {
  const { db, profile } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending =
    profile && (profile.role === "PENDING" || profile.active === false);
  const signin = async () => {
    setBusy(true);
    setError("");
    try {
      await db.auth.signInWithGoogle();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <section className="surface enter-up">
        <div className="eyebrow">Internal</div>
        <h1 style={{ fontSize: "2.25rem" }}>Griffin Ops Hub</h1>
        <p className="lede" style={{ marginBottom: 24 }}>
          Submission preparation, evidence follow-up, closing coordination, and
          Cadre handoffs in one workspace.
        </p>
        {pending ? (
          <>
            <Callout
              type="warning"
              title={
                profile?.active === false
                  ? "Account inactive"
                  : "Account pending"
              }
            >
              You are signed in as {profile.email}. An admin assigns your role
              before any loans appear.
            </Callout>
            <div className="actions" style={{ marginTop: 16 }}>
              <Button variant="outline" onClick={() => db.auth.signOut()}>
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="actions">
              <Button full className="keep" disabled={busy} onClick={signin}>
                {busy
                  ? "Connecting…"
                  : db.mode === "local"
                    ? "Enter demo"
                    : "Sign in with Google"}
              </Button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <p className="small faint" style={{ marginTop: 14 }}>
              griffinfunding.com accounts only. New accounts start as Pending
              until an admin assigns a role.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
