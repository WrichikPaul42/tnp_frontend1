import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import { NotificationRow } from "./Notifications.jsx";
import {
  niceDate,
  initials,
  dataOf,
  StatusBadge,
  Avatar,
  EmptyState,
  Metric,
  PageTitle,
  Skeleton,
  Button,
  IconButton,
  useData,
  ContentPanel,
  errorSummary,
} from "../../components/ui.jsx";

export function StudentDashboard({ profile, api, notify, openPage }) {
  const jobsState = useData(api, "/api/students/jobs");
  const notificationsState = useData(api, "/api/students/notifications");
  const jobs = dataOf(jobsState.data, "jobs");
  const notifications = dataOf(notificationsState.data, "notifications");
  const today = new Date().getHours();
  const greeting =
    today < 12
      ? "Good morning"
      : today < 17
        ? "Good afternoon"
        : "Good evening";
  const applied = jobs.filter((j) => j.has_applied).length;
  const unread = notifications.filter((n) => !n.is_read).length;
  return (
    <>
      <PageTitle
        eyebrow="STUDENT WORKSPACE"
        title={`${greeting}, ${profile.full_name?.split(" ")[0] || "there"}`} //👋
        description="Explore available campus opportunities and track your applications."
        actions={
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => {
              jobsState.reload();
              notificationsState.reload();
            }}
          >
            Refresh
          </Button>
        }
      />
      {/* <section className="student-hero">
        <div className="hero-copy self-start" style={{ minHeight: "290px" }}>
          <div className="hero-tag">
            <Compass size={14} /> YOUR PLACEMENT JOURNEY
          </div>
          <h2>
            Small steps today.
            <br />
            <span>Big opportunities tomorrow.</span>
          </h2>
          <p>
            Discover roles, stay ready for upcoming rounds, and keep your
            profile recruiter-ready.
          </p>
          <div className="hero-actions">
            <Button onClick={() => openPage("opportunities")} icon={ArrowRight}>
              Current Openings
            </Button>
            <Button
              variant="hero-ghost"
              onClick={() => openPage("resumes")}
              icon={FileText}
            >
              Manage resume
            </Button>
          </div>
        </div>
        <div className="hero-art" style={{ margin: "auto" }}>
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="hero-orb">
            <GraduationCap size={62} />
          </div>
          <span className="float-card float-card-one">
            <CheckCircle2 size={17} />
            <span>
              <b>Stay prepared</b>
              <small>Every step counts</small>
            </span>
          </span>
          <span className="float-card float-card-two">
            <Zap size={17} />
            <span>
              <b>Find your fit</b>
              <small>Eligible opportunities</small>
            </span>
          </span>
        </div>
        <div className="hero-meta" style={{ padding: "18px 35px" }}>
          <span>
            <GraduationCap size={16} />
            {profile.branch || "Branch"}{" "}
            {profile.batch ? `· ${profile.batch} batch` : ""}
          </span>
          <span>
            <ShieldCheck size={16} /> IIIT Nagpur verified profile
          </span>
        </div>
      </section> */}
      <div className="metrics-grid">
        <Metric
          label="Eligible opportunities"
          value={jobsState.loading ? "—" : jobs.length}
          // note="Open drives matched to you"
          icon={BriefcaseBusiness}
          color="orange"
        />
        <Metric
          label="Applications started"
          value={applied}
          // note="Stay ready for next steps"
          icon={ClipboardCheck}
          color="blue"
        />
        <Metric
          label="CGPA"
          value={profile.cgpa ?? "—"}
          // note="Academic profile"
          icon={GraduationCap}
          color="green"
        />
        <Metric
          label="Unread notifications"
          value={unread}
          // note="Don't miss an update"
          icon={Bell}
          color="violet"
        />
      </div>
      <div className="dashboard-grid student-dashboard-grid">
        <ContentPanel
          title="Opportunities for you"
          subtitle="Fresh roles matching your eligibility"
          action={
            <Button
              variant="text"
              size="sm"
              icon={ArrowRight}
              onClick={() => openPage("opportunities")}
            >
              View all
            </Button>
          }
        >
          {jobsState.loading ? (
            <Skeleton rows={3} />
          ) : jobsState.error ? (
            errorSummary(jobsState)
          ) : jobs.length ? (
            <div className="opportunity-list">
              {jobs.slice(0, 4).map((job) => (
                <JobCompact
                  key={job.id}
                  job={job}
                  open={() =>
                    openPage("opportunities", { selectedJob: job.id })
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title="Your next opportunity is loading"
              description="There are no matching open drives right now. Check back soon."
            />
          )}
        </ContentPanel>
        <ContentPanel
          title="Your profile snapshot"
          subtitle="Keep your essentials up to date"
          action={
            <IconButton
              icon={ArrowUpRight}
              title="View profile"
              onClick={() => openPage("profile")}
            />
          }
        >
          <div className="profile-snapshot">
            <Avatar name={profile.full_name} size="xl" />
            <div>
              <h3>{profile.full_name || "Student profile"}</h3>
              <p>{profile.bt_id || profile.email}</p>
              <span className="role-pill">
                {profile.branch || "Branch not set"}{" "}
                {profile.batch ? `· Batch ${profile.batch}` : ""}
              </span>
            </div>
          </div>
          <div className="snapshot-stats">
            <div>
              <span>CGPA</span>
              <b>{profile.cgpa ?? "—"}</b>
            </div>
            <div>
              <span>Backlogs</span>
              <b>{profile.active_backlogs ?? profile.backlogs ?? "—"}</b>
            </div>
            <div>
              <span>Phone</span>
              <b>{profile.phone_number || "Not added"}</b>
            </div>
          </div>
          {/* <div className="profile-nudge">
            <div className="nudge-icon">
              <UserRound size={17} />
            </div>
            <div>
              <b>Make your profile stand out</b>
              <p>A complete profile helps you stay application-ready.</p>
            </div>
            <ArrowRight size={16} />
          </div> */}
        </ContentPanel>
      </div>
      <ContentPanel
        title="Recent updates"
        subtitle="Important notices from your placement desk"
        action={
          <Button
            variant="text"
            size="sm"
            onClick={() => openPage("notifications")}
          >
            Open notifications <ArrowRight size={14} />
          </Button>
        }
      >
        {notificationsState.loading ? (
          <Skeleton rows={2} />
        ) : notificationsState.error ? (
          errorSummary(notificationsState)
        ) : notifications.length ? (
          <div className="notification-list compact">
            {notifications.slice(0, 3).map((n) => (
              <NotificationRow
                key={n.id}
                item={n}
                onClick={async () => {
                  if (!n.is_read) {
                    try {
                      await api(`/api/students/notifications/${n.id}/read`, {
                        method: "PATCH",
                      });
                    } catch (error) {
                      notify(error.message, "error");
                    }
                  }
                  openPage("notifications");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="New announcements and placement updates will appear here."
          />
        )}
      </ContentPanel>
    </>
  );
}
function JobCompact({ job, open }) {
  return (
    <button className="job-compact" onClick={open}>
      <div className="company-avatar">{initials(job.company_name)}</div>
      <div className="job-compact-main">
        <div className="job-name-line">
          <b>{job.company_name}</b>
          {job.has_applied && <StatusBadge status="applied" />}
        </div>
        <span>{job.job_title || job.role_title || "Opportunity"}</span>
        <small>
          {job.expected_package || "Package details shared in drive"}
          {job.application_deadline
            ? ` · Deadline ${niceDate(job.application_deadline)}`
            : ""}
        </small>
      </div>
      <ChevronRight size={17} />
    </button>
  );
}
