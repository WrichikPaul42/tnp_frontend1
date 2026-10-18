import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { useState } from "react";
import {
  niceDate,
  humanize,
  dataOf,
  EmptyState,
  PageTitle,
  Skeleton,
  Button,
  useData,
  LoadPanel,
} from "../../components/ui.jsx";

export function NotificationsPage({ api, notify }) {
  const state = useData(api, "/api/students/notifications");
  const [filter, setFilter] = useState("all");
  const items = dataOf(state.data, "notifications");
  const shown = items.filter(
    (item) =>
      filter === "all" || (filter === "unread" ? !item.is_read : item.is_read),
  );
  async function markRead(item) {
    if (item.is_read) return;
    try {
      await api(`/api/students/notifications/${item.id}/read`, {
        method: "PATCH",
      });
      state.reload();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function markAllRead() {
    try {
      await Promise.all(
        items
          .filter((i) => !i.is_read)
          .map((i) =>
            api(`/api/students/notifications/${i.id}/read`, {
              method: "PATCH",
            }),
          ),
      );
      notify("All notifications marked as read.");
      state.reload();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="STAY IN THE LOOP"
        title="Notifications"
        description="Round reminders, application status changes, and important messages from the placement team."
        actions={
          <Button
            variant="outline"
            icon={CheckCircle2}
            disabled={!items.some((i) => !i.is_read)}
            onClick={markAllRead}
          >
            Mark all as read
          </Button>
        }
      />
      {/* <div className="notification-summary">
        <div className="notification-summary-icon">
          <Bell size={22} />
        </div>
        <div>
          <b>
            You have {items.filter((i) => !i.is_read).length} unread{" "}
            {items.filter((i) => !i.is_read).length === 1
              ? "notification"
              : "notifications"}
          </b>
          <p>Important deadlines and updates are collected in one place.</p>
        </div>
      </div> */}
      <div className="content-toolbar">
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{items.length}</span>
          </button>
          <button
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread <span>{items.filter((i) => !i.is_read).length}</span>
          </button>
          <button
            className={filter === "read" ? "active" : ""}
            onClick={() => setFilter("read")}
          >
            Read
          </button>
        </div>
        <Button
          variant="text"
          icon={RefreshCw}
          size="sm"
          onClick={state.reload}
        >
          Refresh
        </Button>
      </div>
      <section className="panel notification-panel">
        {state.loading ? (
          <Skeleton rows={5} />
        ) : state.error ? (
          <LoadPanel state={state} onRetry={state.reload} />
        ) : shown.length ? (
          <div className="notification-list">
            {shown.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onClick={() => markRead(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title={
              filter === "unread" ? "All caught up!" : "No notifications yet"
            }
            description="When the placement team shares an update, you'll see it here."
          />
        )}
      </section>
    </>
  );
}
export function NotificationRow({ item, onClick }) {
  const type = String(item.type || "").toLowerCase();
  const Icon = type.includes("round")
    ? CalendarClock
    : type.includes("application") || type.includes("status")
      ? ClipboardCheck
      : type.includes("drive") || type.includes("job")
        ? BriefcaseBusiness
        : Bell;
  return (
    <button
      className={`notification-row ${item.is_read ? "read" : "unread"}`}
      onClick={onClick}
    >
      <div
        className={`notification-icon ${type.includes("round") ? "blue" : type.includes("application") ? "green" : "orange"}`}
      >
        <Icon size={19} />
      </div>
      <div className="notification-content">
        <div className="notification-row-title">
          <b>{item.title || humanize(item.type || "Placement update")}</b>
          {!item.is_read && <span className="unread-dot" />}
        </div>
        <p>{item.content || item.message || ""}</p>
        <span className="notification-time">
          <Clock3 size={13} />
          {niceDate(item.created_at, true)}
        </span>
      </div>
      {!item.is_read && <span className="mark-read-hint">Mark read</span>}
    </button>
  );
}
