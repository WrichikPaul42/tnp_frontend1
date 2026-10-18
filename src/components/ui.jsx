/* eslint react-refresh/only-export-components: off */
import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Search,
  X,
  CircleAlert,
  CircleCheck,
  RefreshCw,
} from "lucide-react";

export function readError(data, fallback) {
  return (
    data?.detail ||
    data?.message ||
    data?.error_description ||
    data?.msg ||
    fallback
  );
}

export function niceDate(value, withTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(
    "en-IN",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(date);
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "ST"
  );
}

export function humanize(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function dataOf(data, key) {
  return data?.[key] ?? data?.data?.[key] ?? [];
}

export function getProfile(data) {
  return (
    data?.profile || data?.student || data?.data?.profile || data?.data || {}
  );
}

export function statusTone(status = "") {
  const s = String(status).toLowerCase();
  if (
    [
      "selected",
      "success",
      "approved",
      "open",
      "shortlisted",
      "active",
      "cleared",
    ].includes(s)
  )
    return "good";
  if (["rejected", "closed", "failed", "absent", "suspended"].includes(s))
    return "bad";
  if (
    ["pending", "upcoming", "applied", "in progress", "processing"].includes(s)
  )
    return "warn";
  return "neutral";
}

export function StatusBadge({ status, children }) {
  return (
    <span className={`status-badge ${statusTone(status || children)}`}>
      <i />
      {children || humanize(status || "Unknown")}
    </span>
  );
}

export function Avatar({ name, size = "md" }) {
  return <div className={`avatar ${size}`}>{initials(name)}</div>;
}

export function EmptyState({
  icon: Icon = FileText,
  title = "Nothing here yet",
  description = "When there is something to show, it will appear here.",
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={23} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function Metric({ label, value, note, icon: Icon, color = "navy" }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={19} />
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? "—"}</div>
      {note && <div className="metric-note">{note}</div>}
    </article>
  );
}

export function PageTitle({ eyebrow, title, description, actions }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <span />
          <div>
            <b />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  children,
  hint,
  ...props
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <em> *</em>}
      </span>
      {children || (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "",
  icon: Icon,
  onClick,
  disabled,
  type = "button",
  className = "",
  title,
}) {
  return (
    <button
      title={title}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variant} ${size} ${className}`}
    >
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({
  icon: Icon,
  title,
  onClick,
  active = false,
  danger = false,
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`icon-button ${active ? "active" : ""} ${danger ? "danger" : ""}`}
    >
      <Icon size={17} />
    </button>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search anything...",
}) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function Modal({ title, description, children, onClose, wide = false }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton icon={X} title="Close" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || "info"}`}>
      <span className="toast-symbol">
        {toast.type === "error" ? (
          <CircleAlert size={18} />
        ) : (
          <CircleCheck size={18} />
        )}
      </span>
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

export function useData(api, path, key = "") {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api(path)
      .then(({ data }) => {
        if (!cancelled) setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: error.message || "Could not load data.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, key, version]);
  return { ...state, reload };
}

export function LoadPanel({ state, onRetry }) {
  if (state.loading)
    return (
      <div className="panel loading-panel">
        <Skeleton rows={4} />
      </div>
    );
  if (state.error)
    return (
      <div className="panel">
        <div className="inline-error">
          <CircleAlert size={19} />
          <div>
            <b>We couldn't load this information</b>
            <p>{state.error}</p>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={onRetry || (() => location.reload())}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  return null;
}

export function ContentPanel({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DataTable({
  columns,
  rows,
  rowKey = "id",
  emptyTitle = "No results found",
  emptyText = "Try changing your filters.",
}) {
  if (!rows?.length)
    return (
      <EmptyState icon={Search} title={emptyTitle} description={emptyText} />
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === "right" ? "align-right" : ""}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[rowKey] || row.id || i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === "right" ? "align-right" : ""}
                >
                  {col.render
                    ? col.render(row)
                    : (col.key.split(".").reduce((v, k) => v?.[k], row) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function errorSummary(state) {
  return state.error ? (
    <div className="notice error">
      <CircleAlert size={16} />
      {state.error}
    </div>
  ) : null;
}
