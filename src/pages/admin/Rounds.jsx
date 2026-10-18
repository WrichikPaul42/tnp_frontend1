import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileDown,
  Plus,
  RefreshCw,
  Upload,
  X,
  Trash2,
  Pencil,
  Send,
  CalendarClock,
  ListChecks,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  niceDate,
  humanize,
  dataOf,
  StatusBadge,
  Avatar,
  EmptyState,
  PageTitle,
  Skeleton,
  Field,
  Button,
  IconButton,
  Modal,
  useData,
  LoadPanel,
  DataTable,
} from "../../components/ui.jsx";
import { downloadBlob } from "../../components/browser-utils.js";

export function ManageRounds({ api, notify, params }) {
  const drivesState = useData(api, "/api/admin/drives");
  const drives = dataOf(drivesState.data, "drives");
  const [driveId, setDriveId] = useState(params?.driveId || "");
  const [roundsState, setRoundsState] = useState({
    loading: false,
    data: null,
    error: "",
  });
  const [activeRound, setActiveRound] = useState(null);
  const [candidateState, setCandidateState] = useState({
    loading: false,
    data: null,
    error: "",
  });
  const [busyId, setBusyId] = useState("");
  useEffect(() => {
    if (!driveId && drives.length) setDriveId(drives[0].id);
  }, [driveId, drives]);
  const selectedDrive = drives.find((d) => d.id === driveId);
  const loadRounds = useCallback(async () => {
    if (!driveId) {
      setRoundsState({ loading: false, data: null, error: "" });
      return;
    }
    setRoundsState({ loading: true, data: null, error: "" });
    try {
      const { data } = await api(`/api/admin/drives/${driveId}/rounds`);
      setRoundsState({ loading: false, data: data.rounds || data, error: "" });
    } catch (e) {
      setRoundsState({ loading: false, data: null, error: e.message });
    }
  }, [api, driveId]);
  useEffect(() => {
    loadRounds();
  }, [loadRounds]);
  const rounds = Array.isArray(roundsState.data) ? roundsState.data : [];
  async function openCandidates(round) {
    setActiveRound(round);
    setCandidateState({ loading: true, data: null, error: "" });
    try {
      const { data } = await api(
        `/api/admin/drives/${driveId}/rounds/${round.id}/candidates`,
      );
      setCandidateState({ loading: false, data, error: "" });
    } catch (e) {
      setCandidateState({ loading: false, data: null, error: e.message });
    }
  }
  async function updateCandidate(candidate, status) {
    setBusyId(candidate.student_id);
    try {
      await api(
        `/api/admin/drives/${driveId}/rounds/${activeRound.id}/candidates/${candidate.student_id}`,
        { method: "PUT", body: JSON.stringify({ status }) },
      );
      notify(
        `${candidate.full_name} marked ${humanize(status).toLowerCase()}.`,
      );
      await openCandidates(activeRound);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusyId("");
    }
  }
  async function downloadTemplate() {
    try {
      const { response } = await api(
        `/api/admin/drives/${driveId}/rounds/${activeRound.id}/candidates/csv-template`,
      );
      downloadBlob(
        await response.blob(),
        `candidates_round_${activeRound.round_number}_template.csv`,
      );
      notify("Candidates CSV template downloaded.");
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function uploadCsv(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusyId("csv");
    try {
      const { data } = await api(
        `/api/admin/drives/${driveId}/rounds/${activeRound.id}/bulk-status-csv`,
        { method: "POST", body: fd },
      );
      notify(
        data.message ||
          `${data.summary?.matched_and_updated || 0} candidates updated.`,
      );
      await openCandidates(activeRound);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusyId("");
    }
  }
  async function sendReminders(round) {
    if (
      !window.confirm(
        `Send round reminders to eligible candidates for “${round.round_name}”?`,
      )
    )
      return;
    setBusyId(round.id);
    try {
      const { data } = await api(
        `/api/admin/drives/${driveId}/rounds/${round.id}/send-reminders`,
        { method: "POST" },
      );
      notify(
        data.message ||
          `Reminders sent to ${data.candidates_notified || 0} candidates.`,
      );
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusyId("");
    }
  }
  async function addRound() {
    const payload = {
      round_number: rounds.length + 1,
      round_name: `Round ${rounds.length + 1}`,
      round_type: "technical",
      round_mode: "Online",
      round_datetime: null,
      syllabus: "",
    };
    try {
      await api(`/api/admin/drives/${driveId}/rounds`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notify("Selection round added.");
      loadRounds();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function saveRound(round) {
    try {
      await api(`/api/admin/drives/${driveId}/rounds/${round.id}`, {
        method: "PUT",
        body: JSON.stringify(round),
      });
      notify("Round details updated.");
      loadRounds();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function deleteRound(round) {
    if (
      !window.confirm(
        `Delete ${round.round_name}? Existing candidate outcomes may be affected.`,
      )
    )
      return;
    try {
      await api(`/api/admin/drives/${driveId}/rounds/${round.id}`, {
        method: "DELETE",
      });
      notify("Round deleted.");
      loadRounds();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="SELECTION WORKFLOW"
        title="Manage rounds"
        description="Configure selection stages, mark candidate outcomes, import CSV results, and send round reminders."
        actions={
          <Button variant="outline" icon={RefreshCw} onClick={loadRounds}>
            Refresh
          </Button>
        }
      />
      <div className="panel drive-picker-panel">
        <div className="drive-picker-icon">
          <Building2 size={20} />
        </div>
        <div className="drive-picker-copy">
          <b>Choose a recruitment drive</b>
          <p>Rounds and candidates are managed per drive.</p>
        </div>
        <div className="drive-picker-select">
          <select value={driveId} onChange={(e) => setDriveId(e.target.value)}>
            <option value="">Select a placement drive</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company_name} — {d.role_title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!driveId ? (
        <div className="panel">
          <EmptyState
            icon={BriefcaseBusiness}
            title="Select a drive to begin"
            description="Choose a recruitment drive above to view or configure its selection rounds."
          />
        </div>
      ) : (
        <>
          <div className="round-management-banner">
            <div>
              <span className="section-kicker">CURRENT DRIVE</span>
              <h2>{selectedDrive?.company_name || "Placement drive"}</h2>
              <p>
                {selectedDrive?.role_title || "Selection process"} ·{" "}
                {rounds.length} configured rounds
              </p>
            </div>
            <div className="round-banner-actions">
              <StatusBadge status={selectedDrive?.status || "open"} />
              <Button icon={Plus} onClick={addRound} disabled={!selectedDrive}>
                Add round
              </Button>
            </div>
          </div>
          {roundsState.loading ? (
            <div className="panel">
              <Skeleton rows={4} />
            </div>
          ) : roundsState.error ? (
            <div className="panel">
              <LoadPanel state={roundsState} onRetry={loadRounds} />
            </div>
          ) : rounds.length ? (
            <div className="round-admin-list">
              {rounds.map((round, i) => (
                <article className="round-admin-card" key={round.id}>
                  <div className="round-admin-number">
                    {String(round.round_number || i + 1).padStart(2, "0")}
                  </div>
                  <div className="round-admin-content">
                    <div className="round-admin-title">
                      <div>
                        <h3>{round.round_name || `Round ${i + 1}`}</h3>
                        <p>{humanize(round.round_type || "technical")} round</p>
                      </div>
                      <StatusBadge status={round.status || "upcoming"} />
                    </div>
                    <div className="round-admin-meta">
                      <span>
                        <GlobeIcon mode={round.round_mode} />
                        {round.round_mode || "Mode TBA"}
                      </span>
                      <span>
                        <CalendarClock size={14} />
                        {niceDate(round.round_datetime, true)}
                      </span>
                      <span>
                        <BookOpen size={14} />
                        {round.syllabus || "Syllabus not added"}
                      </span>
                    </div>
                    <div className="round-admin-actions">
                      <Button
                        size="sm"
                        icon={ClipboardCheck}
                        onClick={() => openCandidates(round)}
                      >
                        Update results
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Send}
                        disabled={busyId === round.id}
                        onClick={() => sendReminders(round)}
                      >
                        Send reminders
                      </Button>
                      <Button
                        size="sm"
                        variant="text"
                        icon={Pencil}
                        onClick={() =>
                          setActiveRound({ ...round, editing: true })
                        }
                      >
                        Edit
                      </Button>
                      <IconButton
                        icon={Trash2}
                        title="Delete round"
                        danger
                        onClick={() => deleteRound(round)}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                icon={ListChecks}
                title="No selection rounds configured"
                description="Add the first round to start tracking the selection process for this drive."
              />
              <div className="empty-state-actions">
                <Button icon={Plus} onClick={addRound}>
                  Add first round
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {activeRound?.editing && (
        <EditRoundModal
          round={activeRound}
          onClose={() => setActiveRound(null)}
          onSave={async (updated) => {
            await saveRound(updated);
            setActiveRound(null);
          }}
        />
      )}
      {activeRound && !activeRound.editing && (
        <Modal
          title="Update round results"
          description={`${selectedDrive?.company_name || "Placement drive"} · ${activeRound.round_name}`}
          wide
          onClose={() => {
            setActiveRound(null);
            setCandidateState({ loading: false, data: null, error: "" });
          }}
        >
          <div className="round-results-toolbar">
            <div>
              <b>Eligible candidates</b>
              <p>
                Tick to shortlist/select; cross to reject a candidate from this
                drive.
              </p>
            </div>
            <div className="round-results-tools">
              <Button
                size="sm"
                variant="outline"
                icon={FileDown}
                onClick={downloadTemplate}
              >
                Download CSV template
              </Button>
              <label className="btn outline sm upload-results-label">
                <Upload size={15} />
                <span>
                  {busyId === "csv" ? "Uploading…" : "Upload results CSV"}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  disabled={busyId === "csv"}
                  onChange={(e) => uploadCsv(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
          {candidateState.loading ? (
            <Skeleton rows={5} />
          ) : candidateState.error ? (
            <div className="notice error">{candidateState.error}</div>
          ) : (
            <>
              <div className="candidate-stat-row">
                <div>
                  <span>Eligible candidates</span>
                  <b>
                    {candidateState.data?.total_candidates ??
                      candidateState.data?.candidates?.length ??
                      0}
                  </b>
                </div>
                <div>
                  <span>Round type</span>
                  <b>{activeRound.round_mode || "Mode TBA"}</b>
                </div>
                <div>
                  <span>Scheduled</span>
                  <b>{niceDate(activeRound.round_datetime, true)}</b>
                </div>
              </div>
              <DataTable
                columns={[
                  {
                    key: "full_name",
                    label: "Candidate",
                    render: (c) => (
                      <div className="table-company">
                        <Avatar name={c.full_name} size="sm" />
                        <div>
                          <b>{c.full_name}</b>
                          <small>{c.email}</small>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "bt_id",
                    label: "BT ID",
                    render: (c) => <span className="mono-text">{c.bt_id}</span>,
                  },
                  { key: "branch", label: "Branch" },
                  { key: "cgpa", label: "CGPA" },
                  {
                    key: "status",
                    label: "Round status",
                    render: (c) => (
                      <StatusBadge status={c.status || "pending"} />
                    ),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    align: "right",
                    render: (c) => (
                      <div className="table-actions">
                        <IconButton
                          icon={Check}
                          title="Mark selected / passed"
                          active={
                            c.status === "selected" ||
                            c.status === "shortlisted"
                          }
                          onClick={() => updateCandidate(c, "selected")}
                        />
                        <IconButton
                          icon={X}
                          title="Reject candidate"
                          danger
                          onClick={() => updateCandidate(c, "rejected")}
                        />
                      </div>
                    ),
                  },
                ]}
                rows={candidateState.data?.candidates || []}
                emptyTitle="No candidates eligible for this round"
                emptyText="Round 1 lists applicants. Later rounds list only candidates who cleared the previous stage."
              />
            </>
          )}
        </Modal>
      )}
    </>
  );
}
function GlobeIcon({ mode }) {
  return mode === "Offline" ? (
    <Building2 size={14} />
  ) : (
    <ExternalLink size={14} />
  );
}
function EditRoundModal({ round, onClose, onSave }) {
  const [form, setForm] = useState({
    ...round,
    round_datetime: round.round_datetime
      ? new Date(round.round_datetime).toISOString().slice(0, 16)
      : "",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        round_datetime: form.round_datetime
          ? new Date(form.round_datetime).toISOString()
          : null,
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Edit selection round"
      description="Update the schedule and preparation details students will see."
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <Field
          label="Round name"
          value={form.round_name}
          onChange={(v) => setForm((s) => ({ ...s, round_name: v }))}
          required
        />
        <Field
          label="Round type"
          value={form.round_type}
          onChange={(v) => setForm((s) => ({ ...s, round_type: v }))}
        >
          <select
            value={form.round_type}
            onChange={(e) =>
              setForm((s) => ({ ...s, round_type: e.target.value }))
            }
          >
            {[
              "coding",
              "aptitude",
              "technical",
              "hr",
              "group_discussion",
              "other",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Mode"
          value={form.round_mode}
          onChange={(v) => setForm((s) => ({ ...s, round_mode: v }))}
        >
          <select
            value={form.round_mode || "Online"}
            onChange={(e) =>
              setForm((s) => ({ ...s, round_mode: e.target.value }))
            }
          >
            <option>Online</option>
            <option>Offline</option>
          </select>
        </Field>
        <Field
          label="Date & time"
          type="datetime-local"
          value={form.round_datetime}
          onChange={(v) => setForm((s) => ({ ...s, round_datetime: v }))}
        />
        <Field
          label="Syllabus / topics"
          value={form.syllabus || ""}
          onChange={(v) => setForm((s) => ({ ...s, syllabus: v }))}
        />
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save round"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
