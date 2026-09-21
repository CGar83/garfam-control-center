import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  useNavigate,
  useLocation,
  Outlet,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  Folders,
  Users,
  Search,
  Menu,
  ArrowUpRight,
  ArrowRight,
  CornerDownLeft,
  Activity,
  Settings2,
  ChevronDown,
  PanelLeftClose,
  Shield,
  ClipboardList,
  FileCheck2,
  Workflow,
  Plug,
  ChartNoAxesCombined,
  GitBranch,
  BookOpen,
  FilePlus2,
  Keyboard,
  History,
  CircleAlert,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { Dialog, Button, LoadState } from "./ui.jsx";
import { WORK_STATUS_LABEL } from "../lib/operations.js";
import { bucketWork } from "../lib/workView.js";
import { uiShort } from "../lib/catalog.js";
import { listRecent, rememberRecent } from "../lib/recent.js";
import { NewWorkDialog } from "../pages/Operations.jsx";

const identityReady = () =>
  window.dispatchEvent(
    new Event("griffin:before-identity-change", { cancelable: true }),
  );
const EMPTY = [];
const pages = [
  { to: "/", label: "Home", Icon: LayoutDashboard, key: "h", count: "mine" },
  { to: "/loans", label: "Loans", Icon: Folders, key: "l" },
  { to: "/operations", label: "Work", Icon: ClipboardList, key: "w", count: "open" },
  { to: "/journey", label: "Flow", Icon: GitBranch, key: "f" },
  { to: "/workflows", label: "Library", Icon: Workflow, key: "b" },
  {
    to: "/insights",
    label: "Insights",
    Icon: ChartNoAxesCombined,
    key: "i",
    roles: ["MLP", "PROCESSOR", "CLOSING", "LOCK_DESK", "MANAGER", "ADMIN"],
  },
  { to: "/workspace", label: "Admin", Icon: Settings2, key: "a" },
];
const SHORTCUTS = [
  ["⌘ K  or  /", "Search loans, work, and pages"],
  ["N", "Start work on a loan"],
  ["G then H", "Home"],
  ["G then L", "Loans"],
  ["G then W", "Work queue"],
  ["G then F", "Flow"],
  ["G then B", "Library"],
  ["G then I", "Insights"],
  ["?", "Show this list"],
  ["Esc", "Close a dialog"],
];
const initial = (p) =>
  (p?.full_name || "User")
    .split(" ")
    .filter((x) => x !== "Demo")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

// Shared workspace snapshot for the shell: rail counts, breadcrumbs, palette,
// and the global "Start work" dialog. Pages keep loading their own data.
const ShellData = createContext({
  items: EMPTY,
  loans: EMPTY,
  profiles: EMPTY,
  reload: () => {},
});
export const useShellData = () => useContext(ShellData);

function Brand() {
  return (
    <Link to="/" className="lockup" aria-label="Griffin Ops Hub home">
      <span className="gf-monogram">
        gf<span>.</span>
      </span>
      <span>
        <b>Griffin Funding</b>
        <small>OPERATIONS HUB</small>
      </span>
    </Link>
  );
}
function Rail({ onNavigate, onReset, counts }) {
  const { profile, db } = useAuth();
  return (
    <nav className="rail" aria-label="Primary">
      <Brand />
      <div className="workspace-switch">
        <span className="workspace-icon">GF</span>
        <div>
          <strong>Griffin workspace</strong>
          <small>{profile.branch || "Operations"}</small>
        </div>
        <ChevronDown size={14} />
      </div>
      <div className="group">WORKSPACE</div>
      {pages
        .filter((p) => !p.roles || p.roles.includes(profile.role))
        .map(({ to, label, Icon, count }) => {
          const value = count ? counts[count] : null;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => "item" + (isActive ? " active" : "")}
              onClick={onNavigate}
            >
              <Icon size={18} />
              {label}
              {value ? (
                <span
                  className={`fig${count === "open" && counts.blocked ? " alert" : ""}`}
                  aria-label={`${value} ${count === "mine" ? "assigned to you" : "open"}`}
                >
                  {value}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      {profile.role === "ADMIN" && (
        <>
          <div className="group">ADMINISTRATION</div>
          <NavLink
            className={({ isActive }) => "item" + (isActive ? " active" : "")}
            to="/admin/users"
            onClick={onNavigate}
          >
            <Users size={18} />
            Users & roles
          </NavLink>
        </>
      )}
      <div className="spacer" />
      <div className="rail-note">
        <div className="rail-note-icon">
          <Shield size={17} />
          <span>Built around accountability</span>
        </div>
        <p>Loan is the spine. Work is the action. Flow is the map.</p>
        <Link to="/workspace">
          Workspace details
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="status">
        <div className="profile-top">
          <span className="avatar">{initial(profile)}</span>
          <div>
            <b>{profile.full_name.replace("Demo ", "")}</b>
            <small>
              {profile.role} · {profile.branch || "Operations"}
            </small>
          </div>
        </div>
        {db.mode === "local" ? (
          <>
            <label className="sr-only" htmlFor="demo-user">
              Switch demo user
            </label>
            <select
              id="demo-user"
              aria-label="Switch demo user"
              value={profile.id}
              onChange={(e) => {
                if (identityReady()) db.auth.switchDemoUser(e.target.value);
              }}
            >
              {db.auth.listDemoUsers().map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
            <button
              className="textlink"
              onClick={() => {
                if (identityReady()) onReset();
              }}
            >
              Reset demo data
            </button>
          </>
        ) : (
          <button
            className="textlink"
            onClick={() => {
              if (identityReady()) db.auth.signOut();
            }}
          >
            Sign out
          </button>
        )}
      </div>
      <div className="rail-bottom">
        <span>GRIFFIN / INTERNAL</span>
        <PanelLeftClose size={15} />
      </div>
    </nav>
  );
}
function Palette({ onClose, onStartWork }) {
  const { profile } = useAuth(),
    { loans, items: workItems } = useShellData(),
    nav = useNavigate();
  const [q, setQ] = useState(""),
    [sel, setSel] = useState(0);
  const recents = useMemo(() => listRecent(profile.id), [profile.id]);
  const borrowers = useMemo(
    () => Object.fromEntries(loans.map((l) => [l.loan_number, l.borrower_last])),
    [loans],
  );
  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    const loanHit = loans.find(
      (l) => t && l.loan_number.toLowerCase() === t,
    );
    return [
      ...(!t
        ? recents.slice(0, 5).map((r) => ({
            label: r.label,
            fig: r.fig,
            to: r.to,
            group: "RECENT",
            Icon: History,
          }))
        : []),
      ...(t
        ? [
            {
              label: loanHit
                ? `Start work on #${loanHit.loan_number}`
                : /^[a-z0-9-]{4,}$/i.test(t)
                  ? `Start work on #${q.trim()}`
                  : "Start work",
              to: `__start:${loanHit ? loanHit.loan_number : /^[a-z0-9-]{4,}$/i.test(t) ? q.trim() : ""}`,
              group: "ACTIONS",
              Icon: FilePlus2,
              action: true,
            },
          ]
        : [
            {
              label: "Start work on a loan",
              to: "__start:",
              group: "ACTIONS",
              Icon: FilePlus2,
              action: true,
            },
          ]),
      ...workItems
        .filter(
          (item) =>
            !["COMPLETE", "CANCELLED"].includes(item.status) &&
            (!t ||
              `${item.title} ${item.loan_number} ${borrowers[item.loan_number] || item.borrower_last || ""} ${uiShort(item.template_id)}`
                .toLowerCase()
                .includes(t)),
        )
        .slice(0, t ? 8 : 4)
        .map((item) => ({
          label: `${uiShort(item.template_id, item.title)} · ${WORK_STATUS_LABEL[item.status] || item.status}`,
          fig: `#${item.loan_number}${borrowers[item.loan_number] ? ` ${borrowers[item.loan_number]}` : ""}`,
          to: `/work/${item.id}`,
          group: "OPEN WORK",
          Icon: ClipboardList,
        })),
      ...loans
        .filter(
          (l) =>
            !t ||
            `${l.loan_number} ${l.borrower_last}`.toLowerCase().includes(t),
        )
        .slice(0, t ? 8 : 4)
        .map((l) => ({
          label: l.borrower_last || "Unnamed",
          fig: `#${l.loan_number}`,
          to: `/loans/${encodeURIComponent(l.loan_number)}`,
          group: "LOANS",
          Icon: Folders,
        })),
      ...pages
        .filter(
          (p) =>
            (!p.roles || p.roles.includes(profile.role)) &&
            (!t || p.label.toLowerCase().includes(t)),
        )
        .map((p) => ({ ...p, group: "PAGES" })),
      ...[
        { to: "/submissions", label: "DSCR worksheets", Icon: FileCheck2 },
        { to: "/evidence", label: "Evidence & handoffs", Icon: Shield },
        { to: "/workflows?view=references", label: "Source references", Icon: BookOpen },
        { to: "/activity", label: "Activity log", Icon: Activity },
        { to: "/integrations", label: "Connections", Icon: Plug },
      ]
        .filter((p) => !t || p.label.toLowerCase().includes(t))
        .map((p) => ({ ...p, group: "MORE" })),
    ];
  }, [q, loans, workItems, profile.role, recents, borrowers]);
  const go = (item) => {
    if (!item) return;
    onClose();
    if (item.action) {
      onStartWork(item.to.slice("__start:".length));
      return;
    }
    nav(item.to);
  };
  return (
    <Dialog title="Search workspace" onClose={onClose} className="palette">
      <div className="pin">
        <Search />
        <input
          autoFocus
          aria-label="Search"
          placeholder="Loan number, borrower, work, or page…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, items.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              go(items[sel]);
            }
          }}
        />
      </div>
      <div className="list">
        {!items.length && (
          <div className="none">
            No results. Try another loan number or name.
          </div>
        )}
        {items.map((it, i) => (
          <div key={`${it.group}-${it.to}`}>
            {items[i - 1]?.group !== it.group && (
              <div className="ph2">{it.group}</div>
            )}
            <button
              className={"it" + (i === sel ? " sel" : "")}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(it)}
            >
              <it.Icon size={18} />
              {it.label}
              <span className="fig">{it.fig || <ArrowRight size={14} />}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="foot">
        <span>↑ ↓ to move</span>
        <span>
          <CornerDownLeft size={12} /> to open
        </span>
        <span>esc to close</span>
      </div>
    </Dialog>
  );
}

function crumbFor(pathname, loans, items) {
  const base = pages.find((p) => p.to === pathname);
  if (base) return [base.label];
  if (pathname.startsWith("/loans/")) {
    const number = decodeURIComponent(pathname.slice("/loans/".length));
    const loan = loans.find((l) => l.loan_number === number);
    return [
      "Loans",
      loan?.borrower_last ? `${loan.borrower_last} · #${number}` : `#${number}`,
    ];
  }
  if (pathname.startsWith("/work/")) {
    const item = items.find((i) => i.id === pathname.slice("/work/".length));
    return [
      "Work",
      item ? `${uiShort(item.template_id, item.title)} · #${item.loan_number}` : "Work item",
    ];
  }
  if (pathname === "/new" || pathname.startsWith("/worksheets"))
    return ["Work", "DSCR worksheet"];
  if (pathname === "/submissions") return ["Work", "DSCR worksheets"];
  if (pathname.startsWith("/admin")) return ["Admin", "Users & roles"];
  if (pathname === "/evidence") return ["Loans", "Evidence & handoffs"];
  if (pathname === "/references") return ["Library", "References"];
  if (pathname === "/activity") return ["Admin", "Activity"];
  if (pathname === "/integrations") return ["Admin", "Connections"];
  return ["Workspace"];
}

const typingTarget = (el) =>
  !!el &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.isContentEditable);

export default function Shell() {
  const { profile, db } = useAuth(),
    { pathname } = useLocation(),
    nav = useNavigate();
  const [sheet, setSheet] = useState(false),
    [pal, setPal] = useState(false),
    [help, setHelp] = useState(false),
    [start, setStart] = useState(null),
    [reset, setReset] = useState(false),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [snapshot, setSnapshot] = useState({
    items: EMPTY,
    loans: EMPTY,
    profiles: EMPTY,
  });
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    try {
      const [items, loans, profiles] = await Promise.all([
        db.listWorkItems(),
        db.listLoans(),
        db.listProfiles(),
      ]);
      if (request === generation.current) setSnapshot({ items, loans, profiles });
    } catch {
      // The shell degrades to plain navigation when the snapshot is unavailable.
    }
  }, [db]);
  useEffect(() => {
    reload();
  }, [reload, profile?.id, pathname]);
  const shellData = useMemo(
    () => ({ ...snapshot, reload }),
    [snapshot, reload],
  );
  const counts = useMemo(() => {
    const buckets = bucketWork(snapshot.items, profile);
    return {
      mine: buckets.mine.length,
      open: buckets.open.length,
      blocked: buckets.blocked.length,
    };
  }, [snapshot.items, profile]);

  const openPalette = useCallback(() => setPal((v) => !v), []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    let pendingG = 0;
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (typingTarget(document.activeElement)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key;
      if (pendingG && Date.now() - pendingG < 900) {
        pendingG = 0;
        const target = pages.find(
          (p) =>
            p.key === k.toLowerCase() &&
            (!p.roles || p.roles.includes(profile.role)),
        );
        if (target) {
          e.preventDefault();
          nav(target.to);
        }
        return;
      }
      if (k === "/") {
        e.preventDefault();
        setPal(true);
      } else if (k === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (k.toLowerCase() === "n") {
        e.preventDefault();
        setStart({ loan: "" });
      } else if (k.toLowerCase() === "g") {
        pendingG = Date.now();
      }
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("keydown", key);
    };
  }, [nav, openPalette, profile.role]);
  useEffect(() => {
    setSheet(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  const trail = crumbFor(pathname, snapshot.loans, snapshot.items);
  const title = trail.join(" / ");
  useEffect(() => {
    document.title = `${title} · Griffin Ops Hub`;
  }, [title]);
  // Remember loans and work the person opens, per viewer, for the palette.
  useEffect(() => {
    if (!profile?.id) return;
    if (pathname.startsWith("/loans/")) {
      const number = decodeURIComponent(pathname.slice("/loans/".length));
      const loan = snapshot.loans.find((l) => l.loan_number === number);
      rememberRecent(profile.id, {
        to: pathname,
        label: loan?.borrower_last || "Loan",
        fig: `#${number}`,
        kind: "loan",
      });
    } else if (pathname.startsWith("/work/")) {
      const item = snapshot.items.find(
        (i) => i.id === pathname.slice("/work/".length),
      );
      if (item)
        rememberRecent(profile.id, {
          to: pathname,
          label: uiShort(item.template_id, item.title),
          fig: `#${item.loan_number}`,
          kind: "work",
        });
    }
  }, [pathname, profile?.id, snapshot.loans, snapshot.items]);
  const resetDemo = async () => {
    setBusy(true);
    try {
      await db.resetDemo();
      window.location.assign("/");
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  const canStart = [
    "LO",
    "LOA",
    "MLP",
    "PROCESSOR",
    "CLOSING",
    "LOCK_DESK",
    "MANAGER",
    "ADMIN",
  ].includes(profile.role);
  return (
    <ShellData.Provider value={shellData}>
      <div className="app">
        <a href="#main" className="skip">
          Skip to content
        </a>
        <div className="rail-desktop">
          <Rail onReset={() => setReset(true)} counts={counts} />
        </div>
        {sheet && (
          <Dialog
            title="Navigation"
            onClose={() => setSheet(false)}
            className="mobile-nav"
          >
            <Rail
              counts={counts}
              onNavigate={() => setSheet(false)}
              onReset={() => {
                setSheet(false);
                setReset(true);
              }}
            />
          </Dialog>
        )}
        <div className="col">
          <header className="topbar">
            <button
              className="iconbtn hamb"
              aria-label="Open navigation"
              onClick={() => setSheet(true)}
            >
              <Menu size={20} />
            </button>
            <nav className="crumb" aria-label="Breadcrumb">
              <Link to="/">Workspace</Link>
              {trail.map((part, index) => (
                <span key={`${part}-${index}`} className="crumb-part">
                  <span className="sep">/</span>
                  {index === trail.length - 1 ? (
                    <span className="cur" aria-current="page">
                      {part}
                    </span>
                  ) : (
                    <Link
                      to={
                        pages.find((p) => p.label === part)?.to ||
                        (part === "Work" ? "/operations" : "/")
                      }
                    >
                      {part}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
            <div className="right">
              <button className="searchtrig" onClick={() => setPal(true)}>
                <Search size={16} />
                <span>Search anything</span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                className="iconbtn search"
                aria-label="Search"
                onClick={() => setPal(true)}
              >
                <Search size={18} />
              </button>
              {canStart && (
                <button
                  className="btn brand sm topbar-start"
                  onClick={() => setStart({ loan: "" })}
                  title="Start work (N)"
                >
                  <FilePlus2 size={15} />
                  <span>Start work</span>
                </button>
              )}
              <button
                className="iconbtn"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                onClick={() => setHelp(true)}
              >
                <Keyboard size={18} />
              </button>
              <span className="topbar-divider" />
              <span className="avatar topbar-avatar" title={profile.full_name}>
                {initial(profile)}
              </span>
            </div>
          </header>
          {db.mode === "local" && (
            <div className="demo-banner">
              <Shield size={14} />
              <span>
                <strong>Demo workspace</strong>
                <span className="demo-extra">
                  {" "}
                  · Fictional samples and browser-only storage. No live loan
                  systems connected.
                </span>
              </span>
              <Link to="/workspace">
                Details
                <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
          {!online && (
            <div className="offline-banner" role="status">
              You are offline.{" "}
              {db.mode === "local"
                ? "Demo changes stay in this browser."
                : "Reconnect before saving changes."}
            </div>
          )}
          <main id="main" className="main" tabIndex={-1}>
            <div className="inner" key={pathname + (profile?.id || "")}>
              <Suspense fallback={<LoadState loading />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
          <footer className="app-footer">
            <span>Griffin Ops Hub</span>
            <span>Decision support only · Human review required</span>
            <span>
              {db.mode === "local" ? "LOCAL DEMO" : "CONNECTED WORKSPACE"}
            </span>
          </footer>
        </div>
        {pal && (
          <Palette
            onClose={() => setPal(false)}
            onStartWork={(loan) => setStart({ loan })}
          />
        )}
        {start && canStart && (
          <NewWorkDialog
            onClose={() => {
              setStart(null);
              reload();
            }}
            initialLoan={start.loan}
            profiles={snapshot.profiles}
            loans={snapshot.loans}
            openWork={snapshot.items}
          />
        )}
        {help && (
          <Dialog title="Keyboard shortcuts" onClose={() => setHelp(false)}>
            <p className="lede">
              Shortcuts work anywhere outside a text field.
            </p>
            <dl className="shortcut-list">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys}>
                  <dt>
                    <kbd>{keys}</kbd>
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </Dialog>
        )}
        {reset && (
          <Dialog
            title="Reset this demo workspace?"
            onClose={() => {
              if (!busy) setReset(false);
            }}
          >
            <p>
              This removes all worksheets, operations work, and activity stored
              in this browser. Export any records you want to keep first.
            </p>
            <div className="heading-actions" style={{ marginTop: 24 }}>
              <Button variant="brand" disabled={busy} onClick={resetDemo}>
                {busy ? "Resetting…" : "Reset demo data"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setReset(false)}
              >
                Keep records
              </Button>
            </div>
            {err && (
              <p role="alert" className="error">
                <CircleAlert size={14} /> {err}
              </p>
            )}
          </Dialog>
        )}
      </div>
    </ShellData.Provider>
  );
}
