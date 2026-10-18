import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  GraduationCap,
  RefreshCw,
  Users,
  Eye,
  ListChecks,
  FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";
import {
  humanize,
  dataOf,
  StatusBadge,
  Avatar,
  Metric,
  PageTitle,
  Skeleton,
  Button,
  SearchBox,
  useData,
  LoadPanel,
  DataTable,
} from "../../components/ui.jsx";
import { downloadBlob } from "../../components/browser-utils.js";
import { CONFIGURED_API_BASE } from "../../config.js";

function resolveResumeUrl(url, item) {
  if (url && url !== "N/A") {
    const match = url.match(/\/share\/[a-zA-Z0-9_\-]+/);
    if (match) return `${CONFIGURED_API_BASE}${match[0]}`;
    if (
      url.startsWith("http") &&
      !url.includes("192.168.") &&
      !url.includes("localhost") &&
      !url.includes("placeholder.com")
    ) {
      return url;
    }
  }
  if (item?.google_drive_resume_url) return item.google_drive_resume_url;
  if (item?.resume_file_id)
    return `${CONFIGURED_API_BASE}/share/${item.resume_file_id}`;
  return null;
}

export function AdminApplicants({
  api,
  notify,
  search,
  setSearch,
  params,
  openPage,
}) {
  const [company, setCompany] = useState(params?.company || "");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [pageNum, setPageNum] = useState(1);
  const qs = new URLSearchParams();
  if (company.trim()) qs.set("company_name", company.trim());
  if (branch !== "all") qs.set("branch", branch);
  const state = useData(
    api,
    `/api/admin/applicants?${qs.toString()}`,
    `${company}|${branch}|${pageNum}`,
  );
  const applicants = dataOf(state.data, "applicants").filter((a) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      `${a.full_name || ""} ${a.bt_id || ""} ${a.email || ""} ${a.company_name || ""} ${a.role_title || ""}`
        .toLowerCase()
        .includes(term);
    const matchesStatus =
      status === "all" ||
      String(a.application_status || a.status || "applied").toLowerCase() ===
        status;
    return matchesSearch && matchesStatus;
  });
  const companies = [
    ...new Set(applicants.map((a) => a.company_name).filter(Boolean)),
  ];
  async function exportAll() {
    try {
      const query = new URLSearchParams();
      if (company.trim()) query.set("company_name", company.trim());
      if (branch !== "all") query.set("branch", branch);
      if (status !== "all") query.set("status", status);
      const { response } = await api(`/api/admin/applicants/export?${query}`);
      downloadBlob(await response.blob(), "tnp_applicants.csv");
      notify("Applicant export downloaded.");
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CANDIDATE PIPELINE"
        title="Applicants"
        description="Search applicant records, review submitted resumes, and export recruiter rosters. Round decisions happen in Manage Rounds."
        actions={
          <>
            <Button
              variant="outline"
              icon={FileSpreadsheet}
              onClick={exportAll}
            >
              Export CSV
            </Button>
            <Button variant="outline" icon={RefreshCw} onClick={state.reload}>
              Refresh
            </Button>
          </>
        }
      />
      <div className="metrics-grid slim">
        <Metric
          label="Applicants shown"
          value={state.loading ? "—" : (state.data?.count ?? applicants.length)}
          icon={Users}
          color="blue"
        />
        <Metric
          label="Companies represented"
          value={companies.length || "—"}
          icon={Building2}
          color="orange"
        />
        <Metric
          label="Shortlisted"
          value={
            applicants.filter(
              (a) =>
                String(a.application_status || a.status).toLowerCase() ===
                "shortlisted",
            ).length || "—"
          }
          icon={CheckCircle2}
          color="green"
        />
        <Metric
          label="Needs review"
          value={
            applicants.filter((a) =>
              ["applied", "pending", ""].includes(
                String(a.application_status || a.status || "").toLowerCase(),
              ),
            ).length || "—"
          }
          icon={Clock3}
          color="violet"
        />
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPageNum(1);
            }}
            placeholder="Search name, BT ID, email, or role..."
          />
          <div className="toolbar-selects">
            <label className="select-wrap">
              <Building2 size={15} />
              <input
                className="filter-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company (comma-separated)"
              />
            </label>
            <label className="select-wrap">
              <GraduationCap size={15} />
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="all">All branches</option>
                {["CSA", "CSE", "CSD", "CSH", "ECE", "ECI"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="select-wrap">
              <Filter size={15} />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {["applied", "shortlisted", "selected", "rejected"].map((x) => (
                  <option key={x} value={x}>
                    {humanize(x)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {state.loading ? (
          <Skeleton rows={5} />
        ) : state.error ? (
          <LoadPanel state={state} onRetry={state.reload} />
        ) : (
          <DataTable
            columns={[
              {
                key: "full_name",
                label: "Applicant",
                render: (a) => (
                  <div className="table-company">
                    <Avatar name={a.full_name} size="sm" />
                    <div>
                      <b>{a.full_name || "Student"}</b>
                      <small>{a.email}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "bt_id",
                label: "BT ID",
                render: (a) => (
                  <span className="mono-text">
                    {a.bt_id || a.roll_number || "—"}
                  </span>
                ),
              },
              {
                key: "branch",
                label: "Branch",
                render: (a) => (
                  <span className="branch-chip">{a.branch || "—"}</span>
                ),
              },
              {
                key: "cgpa",
                label: "CGPA",
                render: (a) => <b>{a.cgpa ?? "—"}</b>,
              },
              {
                key: "company_name",
                label: "Company / role",
                render: (a) => (
                  <div className="table-role">
                    <b>{a.company_name}</b>
                    <small>{a.role_title || a.job_title}</small>
                  </div>
                ),
              },
              {
                key: "application_status",
                label: "Status",
                render: (a) => (
                  <StatusBadge
                    status={a.application_status || a.status || "applied"}
                  />
                ),
              },
              {
                key: "resume_link",
                label: "Resume",
                render: (a) => {
                  const link = resolveResumeUrl(a.resume_link, a);
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="table-link"
                    >
                      {link.includes("drive.google.com") ? (
                        <ExternalLink size={14} />
                      ) : (
                        <Eye size={14} />
                      )}{" "}
                      {link.includes("drive.google.com") ? "Drive" : "View"}
                    </a>
                  ) : (
                    <span className="muted-value">Not attached</span>
                  );
                },
              },
            ]}
            rows={applicants}
            emptyTitle="No applicants match these filters"
            emptyText="Change your search, company, branch, or application status filters."
          />
        )}
        <div className="panel-bottom">
          <span>{applicants.length} applicant records</span>
          <Button
            variant="text"
            icon={ListChecks}
            size="sm"
            onClick={() => openPage("rounds")}
          >
            Manage selection rounds <ArrowRight size={14} />
          </Button>
        </div>
      </section>
    </>
  );
}
