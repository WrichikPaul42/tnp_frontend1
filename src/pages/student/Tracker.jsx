import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardCheck,
  RefreshCw,
  CalendarClock,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import {
  niceDate,
  initials,
  dataOf,
  statusTone,
  StatusBadge,
  EmptyState,
  PageTitle,
  Skeleton,
  Button,
  Modal,
  useData,
  LoadPanel,
} from "../../components/ui.jsx";

export function StudentTracker({ api, openPage }) {
  const roundsState = useData(api, "/api/students/my-rounds");
  const rawList = Array.isArray(roundsState.data)
    ? roundsState.data
    : dataOf(roundsState.data, "my_drives").length
      ? dataOf(roundsState.data, "my_drives")
      : dataOf(roundsState.data, "drives").length
        ? dataOf(roundsState.data, "drives")
        : dataOf(roundsState.data, "rounds").length
          ? dataOf(roundsState.data, "rounds")
          : dataOf(roundsState.data, "applications").length
            ? dataOf(roundsState.data, "applications")
            : roundsState.data?.my_drives ||
              roundsState.data?.drives ||
              roundsState.data?.rounds ||
              roundsState.data?.applications ||
              [];
  const roundsList = Array.isArray(rawList) ? rawList : [];

  const [selected, setSelected] = useState(null);
  const [roundStatus, setRoundStatus] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function openTracker(item) {
    const driveId = item.drive_id || item.job_id || item.id;
    if (!driveId) {
      setSelected(item);
      return;
    }
    setSelected(item);
    setDetailLoading(true);
    try {
      const { data } = await api(
        `/api/students/drives/${driveId}/rounds-status`,
      );
      setRoundStatus(data);
    } catch (e) {
      setRoundStatus({ error: e.message });
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="YOUR JOURNEY AT A GLANCE"
        title="Application tracker"
        description="Follow your active applications and know what comes next at every selection stage."
        actions={
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={roundsState.reload}
          >
            Refresh
          </Button>
        }
      />
      {/* <div className="tracker-intro">
        <div className="tracker-intro-icon"><ListChecks size={22}/></div>
        <div>
          <b>Every milestone, in one place</b>
          <p>Round outcomes are published by your placement team. Your tracker updates as the process moves forward.</p>
        </div>
      </div> */}
      {roundsState.loading ? (
        <div className="panel">
          <Skeleton rows={4} />
        </div>
      ) : roundsState.error ? (
        <LoadPanel state={roundsState} onRetry={roundsState.reload} />
      ) : roundsList.length ? (
        <div className="tracker-list">
          {roundsList.map((item, i) => {
            const status =
              item.my_latest_status ||
              item.application_status ||
              item.status ||
              "applied";
            const company =
              item.company_name || item.company || "Placement drive";
            const role =
              item.role_title ||
              item.job_title ||
              item.position ||
              "Application";
            const currentStage = item.current_round
              ? item.current_round
              : `${item.total_rounds ?? "Selection"} stages`;
            return (
              <button
                key={item.application_id || item.job_id || item.id || i}
                className="tracker-card"
                onClick={() => openTracker(item)}
              >
                <div className="tracker-company-icon">{initials(company)}</div>
                <div className="tracker-card-main">
                  <div className="tracker-company-line">
                    <h3>{company}</h3>
                    <StatusBadge status={status} />
                  </div>
                  <p>{role}</p>
                  <div className="tracker-meta">
                    <span>
                      <CalendarDays size={14} /> Applied{" "}
                      {niceDate(item.applied_at || item.created_at)}
                    </span>
                    <span>
                      <ListChecks size={14} /> {currentStage}
                    </span>
                  </div>
                </div>
                <ArrowRight size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={ClipboardCheck}
            title="Your application journey starts here"
            description="When you apply to a placement drive, its progress and selection rounds will appear here."
          />
          <div className="empty-state-actions">
            <Button
              onClick={() => openPage("opportunities")}
              icon={BriefcaseBusiness}
            >
              Explore opportunities
            </Button>
          </div>
        </div>
      )}
      {selected && (
        <Modal
          title={
            selected.company_name || selected.company || "Application progress"
          }
          description={
            selected.role_title || selected.job_title || "Placement application"
          }
          wide
          onClose={() => {
            setSelected(null);
            setRoundStatus(null);
          }}
        >
          {detailLoading ? (
            <Skeleton rows={3} />
          ) : roundStatus?.error ? (
            <div className="notice error">{roundStatus.error}</div>
          ) : (
            <TrackerDetail data={roundStatus || selected} selected={selected} />
          )}
        </Modal>
      )}
    </>
  );
}

function TrackerDetail({ data, selected }) {
  const rounds =
    data?.rounds || data?.round_statuses || data?.selection_rounds || [];
  const application = data?.application || data || selected || {};
  const overallStatus =
    selected?.my_latest_status ||
    (data?.is_rejected ? "rejected" : null) ||
    application.application_status ||
    application.status ||
    "applied";
  const currentStage =
    data?.active_round?.round_name ||
    data?.current_round ||
    selected?.current_round ||
    application.active_round_name ||
    "Awaiting update";
  const lastUpdated =
    data?.updated_at ||
    selected?.applied_at ||
    application.updated_at ||
    application.created_at;

  return (
    <>
      <div className="tracker-detail-summary">
        <div>
          <span>Application status</span>
          <StatusBadge status={overallStatus} />
        </div>
        <div>
          <span>Current stage</span>
          <b>{currentStage}</b>
        </div>
        <div>
          <span>Last updated</span>
          <b>{niceDate(lastUpdated)}</b>
        </div>
      </div>
      {rounds.length ? (
        <div className="round-timeline expanded">
          {rounds.map((r, i) => {
            const rawStatus =
              r.my_status || r.round_status || r.status || "upcoming";
            const tone = statusTone(rawStatus);
            return (
              <div className="timeline-item" key={r.round_id || r.id || i}>
                <div className={`timeline-dot ${tone}`}>
                  {tone === "good" ? <Check size={14} /> : i + 1}
                </div>
                <div className="timeline-content">
                  <div className="timeline-heading">
                    <b>{r.round_name || `Round ${r.round_number || i + 1}`}</b>
                    <StatusBadge status={rawStatus} />
                  </div>
                  <p>
                    {r.round_mode || "Mode TBA"} ·{" "}
                    {niceDate(r.round_datetime, true)}
                  </p>
                  {r.syllabus && <small>{r.syllabus}</small>}
                  {r.my_remarks && (
                    <small
                      className="timeline-remarks"
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#64748b",
                      }}
                    >
                      Remarks: {r.my_remarks}
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="Round details are not available yet"
          description="The placement team has not published round updates for this drive."
        />
      )}
    </>
  );
}
