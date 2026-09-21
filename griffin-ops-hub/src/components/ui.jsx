import { useEffect, useRef } from "react";
import { X, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { STAGE_LABEL } from "../lib/stages.js";

export function Label({ children, required, ...props }) {
  return (
    <label className="lbl" {...props}>
      {children}
      {required && <span className="req">*</span>}
    </label>
  );
}

export function Hint({ children }) {
  return children ? <div className="hint">{children}</div> : null;
}

export function Input({ value, onChange, disabled, ...p }) {
  return (
    <input
      className="inp"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      {...p}
    />
  );
}

export function TextArea({ value, onChange, disabled, ...p }) {
  return (
    <textarea
      className="ta"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      {...p}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  ...props
}) {
  return (
    <select
      className="sel"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// Segmented single-select. Active = ink fill.
export function Pills({ value, onChange, options, disabled, ...props }) {
  return (
    <div
      className="seg"
      role="radiogroup"
      {...props}
      onKeyDown={(e) => {
        if (
          disabled ||
          ![
            "ArrowRight",
            "ArrowDown",
            "ArrowLeft",
            "ArrowUp",
            "Home",
            "End",
          ].includes(e.key)
        )
          return;
        e.preventDefault();
        const index = options.indexOf(value);
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? options.length - 1
              : (Math.max(0, index) +
                  (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1) +
                  options.length) %
                options.length;
        onChange(options[next]);
        e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
      }}
    >
      {options.map((o) => (
        <button
          type="button"
          key={o}
          role="radio"
          tabIndex={
            value === o || (!options.includes(value) && o === options[0])
              ? 0
              : -1
          }
          aria-checked={value === o}
          className={value === o ? "on" : ""}
          disabled={disabled}
          onClick={() => !disabled && onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function YesNo({ value, onChange, disabled, ...props }) {
  return (
    <Pills
      value={value}
      onChange={onChange}
      options={["Yes", "No"]}
      disabled={disabled}
      {...props}
    />
  );
}

export function Check({ on, onChange, label, disabled, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!on}
      className={"ck" + (on ? " on" : "")}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      {...props}
    >
      <span className="box">{on ? "✓" : ""}</span>
      {label}
    </button>
  );
}

export function Callout({ type = "info", title, children }) {
  return (
    <div
      className={"callout " + type}
      role={type === "restriction" ? "alert" : "note"}
    >
      <div className="rule" />
      <div>
        <div className="ct">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// Surface with optional numbered index and kicker.
export function Surface({
  title,
  n,
  kicker,
  right,
  children,
  className = "",
  id,
}) {
  return (
    <section className={"surface " + className} id={id}>
      {title && (
        <div className="st">
          {n != null && (
            <span className="idx">{String(n).padStart(2, "0")}</span>
          )}
          <h2>{title}</h2>
          {right && <div className="right">{right}</div>}
          {kicker && <div className="kick">{kicker}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, lede, children }) {
  return (
    <header className="ph enter-up">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children && <div className="cta">{children}</div>}
    </header>
  );
}

// Ruled band. cells: [{fig, label, sub, brand, small}]
export function StatStrip({ cells, className = "" }) {
  return (
    <div className={"strip enter-up d1 " + className}>
      {cells.map((c, i) => (
        <div className="cell" key={i}>
          <div
            className={
              "fig" + (c.brand ? " brand" : "") + (c.small ? " sm" : "")
            }
          >
            {c.fig}
          </div>
          <div className="lab">{c.label}</div>
          {c.sub && <div className="sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function Button({
  variant = "default",
  size,
  full,
  to,
  children,
  className = "",
  ...p
}) {
  const cls = [
    "btn",
    variant !== "default" ? variant : "",
    size === "sm" ? "sm" : "",
    full ? "full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (to)
    return (
      <Link to={to} className={cls} {...p}>
        {children}
      </Link>
    );
  return (
    <button type="button" className={cls} {...p}>
      {children}
    </button>
  );
}

export function Badge({ variant = "muted", children }) {
  return <span className={"badge " + variant}>{children}</span>;
}

export function StageBadge({ stage }) {
  const v =
    stage === "COMPLETE"
      ? "ok"
      : stage?.startsWith("RETURNED")
        ? "warn"
        : ["LO_SUBMITTED", "MLP_REVIEW", "MLP_VERIFIED"].includes(stage)
          ? "brand"
          : ["SUBMITTED_TO_PROCESSING", "PROCESSING_ACCEPTED"].includes(stage)
            ? "outline"
            : "muted";
  return <Badge variant={v}>{STAGE_LABEL[stage] || stage}</Badge>;
}

export function Dialog({ title, onClose, children, className = "" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const focusables = () =>
      [
        ...el.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter((e) => !e.hidden);
    (
      el.querySelector("[autofocus],input,textarea") ||
      focusables()[0] ||
      el
    ).focus();
    const key = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const all = focusables(),
          first = all[0],
          last = all[all.length - 1];
        if (!first) {
          event.preventDefault();
          el.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      el.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={"dialog " + className}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-header">
          <h3>{title}</h3>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoadState({ loading, error, onRetry }) {
  if (error)
    return (
      <div className="load-error" role="alert">
        <h2>We couldn’t load this workspace.</h2>
        <p>{error.message || "Try again to refresh your records."}</p>
        <Button variant="outline" onClick={onRetry}>
          <RotateCw size={16} />
          Try again
        </Button>
      </div>
    );
  if (loading)
    return (
      <div
        className="loading-skeleton"
        role="status"
        aria-label="Loading workspace"
      >
        <div />
        <div />
        <div />
        <span>Loading workspace…</span>
      </div>
    );
  return null;
}

export function Table({ children }) {
  return (
    <div className="tw">
      <table className="t">{children}</table>
    </div>
  );
}

export function fmtHours(h) {
  if (h == null) return "–";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export function fmtDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
