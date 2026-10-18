import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  GraduationCap,
  Plus,
  Users,
  ChartNoAxesCombined,
  ListChecks,
} from "lucide-react";
import {
  niceDate,
  initials,
  dataOf,
  StatusBadge,
  EmptyState,
  Metric,
  PageTitle,
  Skeleton,
  Button,
  useData,
  ContentPanel,
  errorSummary,
} from "../../components/ui.jsx";

export function AdminDashboard({ api, openPage }) {
  const drivesState = useData(api, "/api/admin/drives");
  const applicantsState = useData(api, "/api/admin/applicants");
  const studentsState = useData(api, "/api/admin/active-students");
  const drives = dataOf(drivesState.data, "drives");
  const applicants = dataOf(applicantsState.data, "applicants");
  const students = dataOf(studentsState.data, "students");
  const [roundsState, setRoundsState] = useState({
    loading: true,
    count: 0,
    error: "",
  });

  // The drives endpoint intentionally does not embed rounds. Load them from
  // the existing per-drive rounds endpoint and add their counts together.
  useEffect(() => {
    let cancelled = false;

    if (drivesState.loading) {
      setRoundsState((current) =>
        current.loading ? current : { ...current, loading: true },
      );
      return () => {
        cancelled = true;
      };
    }

    if (drivesState.error) {
      setRoundsState({ loading: false, count: 0, error: drivesState.error });
      return () => {
        cancelled = true;
      };
    }

    const driveRows = dataOf(drivesState.data, "drives");
    if (!driveRows.length) {
      setRoundsState({ loading: false, count: 0, error: "" });
      return () => {
        cancelled = true;
      };
    }

    setRoundsState({ loading: true, count: 0, error: "" });

    Promise.all(
      driveRows.map(async (drive) => {
        const { data } = await api(`/api/admin/drives/${drive.id}/rounds`);
        if (Array.isArray(data?.rounds)) return data.rounds.length;
        if (Array.isArray(data)) return data.length;
        const total = Number(data?.total_rounds);
        return Number.isFinite(total) && total >= 0 ? total : 0;
      }),
    )
      .then((counts) => {
        if (!cancelled) {
          setRoundsState({
            loading: false,
            count: counts.reduce((total, count) => total + count, 0),
            error: "",
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRoundsState({
            loading: false,
            count: 0,
            error: error?.message || "Could not load selection rounds.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, drivesState.data, drivesState.error, drivesState.loading]);

  const loading =
    drivesState.loading || applicantsState.loading || studentsState.loading;

  return (
    <>
      <PageTitle
        eyebrow="PLACEMENT OPERATIONS"
        title="Dashboard"
        description="A clear, real-time view of campus recruitment activity and student engagement."
        actions={
          <Button icon={Plus} onClick={() => openPage("create-drive")}>
            Create placement drive
          </Button>
        }
      />
      <div className="metrics-grid">
        <Metric
          label="Total drives"
          value={loading ? "—" : drives.length}
          note={`${drives.filter((d) => String(d.status).toLowerCase() === "open").length} currently open`}
          icon={BriefcaseBusiness}
          color="orange"
        />
        <Metric
          label="Applicants"
          value={
            loading ? "—" : (applicantsState.data?.count ?? applicants.length)
          }
          note="Across recruitment drives"
          icon={Users}
          color="blue"
        />
        <Metric
          label="Active students"
          value={loading ? "—" : (studentsState.data?.count ?? students.length)}
          note="Recently active on portal"
          icon={GraduationCap}
          color="green"
        />
        <Metric
          label="Selection rounds"
          value={
            drivesState.loading || roundsState.loading || roundsState.error
              ? "—"
              : roundsState.count
          }
          note={
            roundsState.error
              ? "Unable to load rounds"
              : "Configured across all drives"
          }
          icon={ListChecks}
          color="violet"
        />
      </div>
      <div className="dashboard-grid admin-dashboard-grid">
        <ContentPanel
          title="Recently created drives"
          subtitle="The latest recruitment activity"
          action={
            <Button variant="text" size="sm" onClick={() => openPage("drives")}>
              All drives <ArrowRight size={14} />
            </Button>
          }
        >
          {drivesState.loading ? (
            <Skeleton rows={4} />
          ) : drivesState.error ? (
            errorSummary(drivesState)
          ) : drives.length ? (
            <div className="recent-drive-list">
              {drives.slice(0, 5).map((d) => (
                <button
                  key={d.id}
                  className="recent-drive-row"
                  onClick={() => openPage("rounds", { driveId: d.id })}
                >
                  <div className="company-avatar">{initials(d.company_name)}</div>
                  <div>
                    <b>{d.company_name}</b>
                    <span>{d.role_title}</span>
                    <small>Created {niceDate(d.created_at)}</small>
                  </div>
                  <StatusBadge status={d.status || "open"} />
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No drives created yet"
              description="Publish your first recruitment drive to get started."
            />
          )}
        </ContentPanel>
        <ContentPanel
          title="Quick actions"
          subtitle="Common tasks, one click away"
        >
          <div className="quick-actions-grid">
            <QuickAction
              icon={Plus}
              title="Create a drive"
              description="Publish a new opportunity"
              onClick={() => openPage("create-drive")}
            />
            <QuickAction
              icon={Users}
              title="Review applicants"
              description="Search and export applicant data"
              onClick={() => openPage("applicants")}
            />
            <QuickAction
              icon={ListChecks}
              title="Update round results"
              description="Manage shortlist and selection"
              onClick={() => openPage("rounds")}
            />
            <QuickAction
              icon={ChartNoAxesCombined}
              title="Explore analytics"
              description="Track recruitment performance"
              onClick={() => openPage("analytics")}
            />
          </div>
        </ContentPanel>
      </div>
      <ContentPanel
        title="Recruitment pulse"
        subtitle="Current status distribution"
      >
        <div className="pulse-grid">
          <PulseStatus
            label="Open"
            count={
              drives.filter((d) => String(d.status).toLowerCase() === "open")
                .length
            }
            all={drives.length}
            tone="green"
          />
          <PulseStatus
            label="Closed"
            count={
              drives.filter((d) => String(d.status).toLowerCase() === "closed")
                .length
            }
            all={drives.length}
            tone="orange"
          />
          <PulseStatus
            label="Draft / other"
            count={
              drives.filter(
                (d) =>
                  !["open", "closed"].includes(String(d.status).toLowerCase()),
              ).length
            }
            all={drives.length}
            tone="blue"
          />
        </div>
      </ContentPanel>
    </>
  );
}

export function QuickAction({ icon: Icon, title, description, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-action-icon">
        <Icon size={19} />
      </span>
      <span>
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <ArrowUpRight size={15} />
    </button>
  );
}

function PulseStatus({ label, count, all, tone }) {
  return (
    <div className="pulse-item">
      <div className="pulse-label">
        <span className={`pulse-dot ${tone}`} />
        <span>{label}</span>
        <b>{count}</b>
      </div>
      <div className="pulse-track">
        <span
          className={tone}
          style={{ width: `${all ? (count / all) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
