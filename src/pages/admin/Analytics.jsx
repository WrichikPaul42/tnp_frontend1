import {
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  Users,
  XCircle,
  ChartNoAxesCombined,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  humanize,
  dataOf,
  EmptyState,
  Metric,
  PageTitle,
  Skeleton,
  Button,
  useData,
  LoadPanel,
  ContentPanel,
} from "../../components/ui.jsx";

export function AdminAnalytics({ api }) {
  const [driveId, setDriveId] = useState("");
  const drivesState = useData(api, "/api/admin/drives");
  const drives = dataOf(drivesState.data, "drives");

  useEffect(() => {
    if (!driveId && drives.length) setDriveId(drives[0].id);
  }, [driveId, drives]);

  const state = useData(
    api,
    driveId ? `/api/admin/drives/${driveId}/analytics` : "/api/admin/drives",
    driveId,
  );

  // The backend wraps its metrics in { analytics: { ... } } and uses
  // eligibility/application field names rather than status-count fields.
  const data = state.data?.analytics ?? state.data?.data?.analytics ?? {};
  const bars = [
    ["Eligible students", data.eligible_students],
    ["Applied (eligible)", data.applied_out_of_eligible],
    ["Eligible but not applied", data.unapplied_but_eligible],
    ["Rejected but eligible", data.rejected_but_eligible],
    ["Ineligible students", data.ineligible_students],
  ].filter(([, value]) => value !== null && value !== undefined);
  const maxBarValue = Math.max(1, ...bars.map(([, value]) => Number(value) || 0));

  return (
    <>
      <PageTitle
        eyebrow="PLACEMENT INTELLIGENCE"
        title="Analytics"
        description="Understand drive-level eligibility, applications, and selection activity."
        actions={
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={driveId ? state.reload : drivesState.reload}
          >
            Refresh
          </Button>
        }
      />

      <div className="panel analytics-drive-select">
        <div>
          <h3>Analyze a drive</h3>
          <p>Choose a recruitment drive to load its current analytics.</p>
        </div>
        <select
          value={driveId}
          onChange={(event) => setDriveId(event.target.value)}
          disabled={drivesState.loading || drivesState.error || !drives.length}
        >
          <option value="">Select a drive</option>
          {drives.map((drive) => (
            <option key={drive.id} value={drive.id}>
              {drive.company_name} — {drive.role_title}
            </option>
          ))}
        </select>
      </div>

      {drivesState.loading ? (
        <div className="panel">
          <Skeleton rows={3} />
        </div>
      ) : drivesState.error ? (
        <LoadPanel state={drivesState} onRetry={drivesState.reload} />
      ) : !drives.length ? (
        <div className="panel">
          <EmptyState
            icon={ChartNoAxesCombined}
            title="No placement drives available"
            description="Analytics will be available after a placement drive has been created."
          />
        </div>
      ) : !driveId ? (
        <div className="panel">
          <EmptyState
            icon={ChartNoAxesCombined}
            title="Select a placement drive"
            description="Choose a drive above to view its eligibility and application metrics."
          />
        </div>
      ) : state.loading ? (
        <div className="panel">
          <Skeleton rows={4} />
        </div>
      ) : state.error ? (
        <LoadPanel state={state} onRetry={state.reload} />
      ) : (
        <>
          <div className="metrics-grid">
            <Metric
              label="Total students"
              value={data.total_students ?? "—"}
              icon={Users}
              color="blue"
            />
            <Metric
              label="Eligible students"
              value={data.eligible_students ?? "—"}
              icon={GraduationCap}
              color="green"
            />
            <Metric
              label="Applied (eligible)"
              value={data.applied_out_of_eligible ?? "—"}
              icon={CheckCircle2}
              color="orange"
            />
            <Metric
              label="Eligible but not applied"
              value={data.unapplied_but_eligible ?? "—"}
              icon={XCircle}
              color="violet"
            />
          </div>

          <div className="dashboard-grid analytics-grid">
            <ContentPanel
              title="Eligibility and application breakdown"
              subtitle="Student counts for the selected drive"
            >
              {bars.length ? (
                <div className="simple-bars">
                  {bars.map(([name, value]) => (
                    <div className="simple-bar-item" key={name}>
                      <div>
                        <span>{name}</span>
                        <b>{Number(value) || 0}</b>
                      </div>
                      <div className="simple-bar-track">
                        <i
                          style={{
                            width: `${Math.min(
                              100,
                              ((Number(value) || 0) / maxBarValue) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ChartNoAxesCombined}
                  title="No analytics available"
                  description="The backend returned no metrics for this drive."
                />
              )}
            </ContentPanel>

            <ContentPanel
              title="Drive insights"
              subtitle="Eligibility metrics returned by the backend"
            >
              <div className="analytics-facts">
                {Object.entries(data)
                  .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>{humanize(key)}</span>
                      <b>{String(value)}</b>
                    </div>
                  ))}
              </div>
            </ContentPanel>
          </div>
        </>
      )}
    </>
  );
}
