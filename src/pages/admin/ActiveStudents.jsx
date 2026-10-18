import { ChevronLeft, ChevronRight, GraduationCap, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  niceDate,
  dataOf,
  StatusBadge,
  Avatar,
  PageTitle,
  Skeleton,
  Button,
  SearchBox,
  useData,
  LoadPanel,
  DataTable,
} from "../../components/ui.jsx";

const PAGE_SIZE = 50;

export function ActiveStudents({ api, search, setSearch }) {
  const [branch, setBranch] = useState("all");
  const [page, setPage] = useState(1);

  // The current backend endpoint returns the full student list and does not
  // implement search, branch, or pagination query parameters. Filter locally.
  const state = useData(api, "/api/admin/active-students");
  const allStudents = dataOf(state.data, "students");
  const searchTerm = String(search || "").trim().toLowerCase();

  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      !searchTerm ||
      [student.full_name, student.bt_id, student.email, student.branch].some(
        (value) => String(value ?? "").toLowerCase().includes(searchTerm),
      );
    const matchesBranch =
      branch === "all" || String(student.branch || "").toUpperCase() === branch;
    return matchesSearch && matchesBranch;
  });

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const visibleStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateBranch(value) {
    setBranch(value);
    setPage(1);
  }

  return (
    <>
      <PageTitle
        eyebrow="STUDENT ENGAGEMENT"
        title="Active students"
        description="Monitor student activity and review verified profile information for placement operations."
        actions={
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={state.reload}
          >
            Refresh
          </Button>
        }
      />
      <section className="panel">
        <div className="list-toolbar">
          <SearchBox
            value={search || ""}
            onChange={updateSearch}
            placeholder="Search student, BT ID, email..."
          />
          <div className="toolbar-selects">
            <label className="select-wrap">
              <GraduationCap size={15} />
              <select
                value={branch}
                onChange={(event) => updateBranch(event.target.value)}
              >
                <option value="all">All branches</option>
                {[
                  "CSE",
                  "ECE",
                  "CSA",
                  "CSD",
                  "CSH",
                  "ECI",
                  "AIDS",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
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
                label: "Student",
                render: (student) => (
                  <div className="table-company">
                    <Avatar name={student.full_name} size="sm" />
                    <div>
                      <b>{student.full_name}</b>
                      <small>{student.email}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "bt_id",
                label: "BT ID",
                render: (student) => (
                  <span className="mono-text">{student.bt_id || "—"}</span>
                ),
              },
              {
                key: "branch",
                label: "Branch",
                render: (student) => (
                  <span className="branch-chip">{student.branch || "—"}</span>
                ),
              },
              { key: "cgpa", label: "CGPA" },
              {
                key: "last_active_at",
                label: "Last active",
                render: (student) => niceDate(student.last_active_at, true),
              },
              {
                key: "is_admin",
                label: "Access",
                render: (student) =>
                  student.is_superadmin ? (
                    <StatusBadge status="selected">Superadmin</StatusBadge>
                  ) : student.is_admin ? (
                    <StatusBadge status="shortlisted">Admin</StatusBadge>
                  ) : (
                    <span className="muted-value">Student</span>
                  ),
              },
            ]}
            rows={visibleStudents}
            emptyTitle="No matching students"
            emptyText="Try a different search or branch filter."
          />
        )}

        {!state.loading && !state.error && (
          <div className="panel-bottom">
            <span>
              Showing {visibleStudents.length} of {filteredStudents.length} matching students
              {searchTerm || branch !== "all"
                ? ` (${allStudents.length} total)`
                : ""}
            </span>
            <div>
              <span className="muted-value" style={{ alignSelf: "center" }}>
                Page {page} of {pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
