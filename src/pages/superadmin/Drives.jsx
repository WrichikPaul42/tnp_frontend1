import {
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
  CircleAlert,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  niceDate,
  initials,
  dataOf,
  StatusBadge,
  PageTitle,
  Skeleton,
  Field,
  Button,
  IconButton,
  SearchBox,
  Modal,
  useData,
  LoadPanel,
  DataTable,
} from "../../components/ui.jsx";

export function SuperadminDrives({ api, notify, search, setSearch }) {
  const state = useData(api, "/api/admin/drives");
  const drives = dataOf(state.data, "drives").filter((d) =>
    `${d.company_name} ${d.role_title}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const [selected, setSelected] = useState(null);
  const [forceDrive, setForceDrive] = useState(null);
  return (
    <>
      <PageTitle
        eyebrow="PRIVILEGED OVERRIDES"
        title="Drive overrides"
        description="Superadmin tools for exceptional corrections to recruitment drive metadata and status."
        actions={
          <Button variant="outline" icon={RefreshCw} onClick={state.reload}>
            Refresh
          </Button>
        }
      />
      <div className="notice warning">
        <ShieldCheck size={17} />
        <span>
          These are privileged overrides. All changes are audited. Use normal
          admin workflows for routine drive management.
        </span>
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search drives..."
          />
        </div>
        {state.loading ? (
          <Skeleton rows={5} />
        ) : state.error ? (
          <LoadPanel state={state} onRetry={state.reload} />
        ) : (
          <DataTable
            columns={[
              {
                key: "company_name",
                label: "Company",
                render: (d) => (
                  <div className="table-company">
                    <div className="company-avatar sm">
                      {initials(d.company_name)}
                    </div>
                    <div>
                      <b>{d.company_name}</b>
                      <small>{d.role_title}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (d) => <StatusBadge status={d.status} />,
              },
              {
                key: "created_at",
                label: "Created",
                render: (d) => niceDate(d.created_at),
              },
              {
                key: "actions",
                label: "Privileged actions",
                align: "right",
                render: (d) => (
                  <div className="table-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={SlidersHorizontal}
                      onClick={() => setSelected(d)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Zap}
                      onClick={() => setForceDrive(d)}
                    >
                      Force apply
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={drives}
            emptyTitle="No drives found"
            emptyText="All recruitment drives are listed here."
          />
        )}
      </section>
      {selected && (
        <DriveOverrideModal
          drive={selected}
          api={api}
          notify={notify}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            state.reload();
          }}
        />
      )}
      {forceDrive && (
        <ForceApplyModal
          drive={forceDrive}
          api={api}
          notify={notify}
          onClose={() => setForceDrive(null)}
          onSaved={() => {
            setForceDrive(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}
const ELIGIBILITY_BRANCHES = ["CSE", "ECE", "CSA", "CSD", "CSH", "ECI"];
const ELIGIBILITY_BATCHES = ["2024", "2025", "2026", "2027", "2028", "2029"];
const ELIGIBILITY_OPERATORS = [
  { value: ">=", label: "Greater than or equal to" },
  { value: "<=", label: "Less than or equal to" },
  { value: "==", label: "Equal to" },
  { value: "!=", label: "Not equal to" },
  { value: "in", label: "In list (comma-separated)" },
];

function parseEligibilityRules(rawRules) {
  if (rawRules && typeof rawRules === "object") return rawRules;
  if (typeof rawRules === "string") {
    try {
      const parsed = JSON.parse(rawRules);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function eligibilityValueToString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function eligibilityValueToList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function eligibilityFieldKey(field) {
  return String(field || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getEligibilityForm(rawRules) {
  const rules = parseEligibilityRules(rawRules);
  const conditions = Array.isArray(rules.conditions) ? rules.conditions : [];
  const form = {
    eligibility_logic: rules.logic || "AND",
    min_cgpa: "",
    max_backlogs: "",
    max_education_gaps: "",
    allowed_branches: [],
    allowed_batches: [],
    min_tenth_percentage: "",
    min_twelfth_percentage: "",
    custom_criteria: [],
  };

  conditions.forEach((condition) => {
    if (!condition || typeof condition !== "object") return;
    const field = eligibilityFieldKey(condition.field);
    const operator = String(condition.operator || "");
    const value = condition.value;

    if (field === "cgpa" && operator === ">=") {
      form.min_cgpa = eligibilityValueToString(value);
    } else if (["backlogs", "active_backlogs", "max_backlogs"].includes(field) && operator === "<=") {
      form.max_backlogs = eligibilityValueToString(value);
    } else if (["education_gaps", "max_education_gaps"].includes(field) && operator === "<=") {
      form.max_education_gaps = eligibilityValueToString(value);
    } else if (["branch", "allowed_branches"].includes(field) && operator === "in") {
      form.allowed_branches = eligibilityValueToList(value);
    } else if (["batch", "passing_year", "allowed_batches"].includes(field) && operator === "in") {
      form.allowed_batches = eligibilityValueToList(value);
    } else if (["tenth_percentage", "min_tenth_percentage"].includes(field) && operator === ">=") {
      form.min_tenth_percentage = eligibilityValueToString(value);
    } else if (["twelfth_percentage", "min_twelfth_percentage"].includes(field) && operator === ">=") {
      form.min_twelfth_percentage = eligibilityValueToString(value);
    } else {
      form.custom_criteria.push({
        field: eligibilityValueToString(condition.field),
        operator: ELIGIBILITY_OPERATORS.some((item) => item.value === operator)
          ? operator
          : operator || ">=",
        value: Array.isArray(value) ? value.join(", ") : eligibilityValueToString(value),
      });
    }
  });

  return form;
}

function buildEligibilityRules(form, rawRules) {
  const originalRules = parseEligibilityRules(rawRules);
  const conditions = [];
  const addNumberCondition = (field, operator, value) => {
    const input = String(value ?? "").trim();
    if (input !== "" && Number.isFinite(Number(input))) {
      conditions.push({ field, value: Number(input), operator });
    }
  };

  addNumberCondition("cgpa", ">=", form.min_cgpa);
  addNumberCondition("backlogs", "<=", form.max_backlogs);
  addNumberCondition("education_gaps", "<=", form.max_education_gaps);

  if (form.allowed_branches.length) {
    conditions.push({
      field: "branch",
      value: form.allowed_branches,
      operator: "in",
    });
  }
  if (form.allowed_batches.length) {
    conditions.push({
      field: "batch",
      value: form.allowed_batches,
      operator: "in",
    });
  }

  addNumberCondition("tenth_percentage", ">=", form.min_tenth_percentage);
  addNumberCondition("twelfth_percentage", ">=", form.min_twelfth_percentage);

  form.custom_criteria
    .filter((rule) => String(rule.field || "").trim() && String(rule.value ?? "").trim() !== "")
    .forEach((rule) => {
      const rawValue = String(rule.value).trim();
      let value = rawValue;
      if (rule.operator === "in") {
        value = rawValue.split(",").map((item) => item.trim()).filter(Boolean);
      } else if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
        value = Number(rawValue);
      }
      conditions.push({
        field: rule.field.trim(),
        operator: rule.operator || ">=",
        value,
      });
    });

  return {
    ...originalRules,
    logic: form.eligibility_logic || originalRules.logic || "AND",
    conditions,
  };
}

function DriveOverrideModal({ drive, api, notify, onClose, onSaved }) {
  const metadata = drive.raw_csv_data || {};
  const [form, setForm] = useState(() => ({
    company_name: drive.company_name || "",
    role_title: drive.role_title || "",
    status: drive.status || "open",
    job_description: metadata.job_description || "",
    expected_package: metadata.expected_package || drive.expected_package || "",
    application_deadline: (
      drive.application_deadline ||
      metadata.application_deadline ||
      ""
    ).slice(0, 16),
    ...getEligibilityForm(drive.eligibility_rules),
  }));
  const [saving, setSaving] = useState(false);
  const branchOptions = [...new Set([...ELIGIBILITY_BRANCHES, ...form.allowed_branches])];
  const batchOptions = [...new Set([...ELIGIBILITY_BATCHES, ...form.allowed_batches])];

  function toggleListValue(key, value) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function updateCustomRule(index, key, value) {
    setForm((current) => ({
      ...current,
      custom_criteria: current.custom_criteria.map((rule, i) =>
        i === index ? { ...rule, [key]: value } : rule,
      ),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        company_name: form.company_name,
        role_title: form.role_title,
        status: form.status,
        job_description: form.job_description,
        expected_package: form.expected_package,
        eligibility_rules: buildEligibilityRules(form, drive.eligibility_rules),
        application_deadline: form.application_deadline
          ? new Date(form.application_deadline).toISOString()
          : null,
      };
      await api(`/api/superadmin/drives/${drive.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      notify("Drive override saved and audited.");
      onSaved();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Privileged drive override"
      description={`${drive.company_name} · ${drive.id}`}
      wide
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Company name"
            value={form.company_name}
            onChange={(v) => setForm((s) => ({ ...s, company_name: v }))}
            required
          />
          <Field
            label="Role title"
            value={form.role_title}
            onChange={(v) => setForm((s) => ({ ...s, role_title: v }))}
            required
          />
          <Field label="Drive status" value={form.status} onChange={(v) => setForm((s) => ({ ...s, status: v }))}>
            <select
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field
            label="Expected package"
            value={form.expected_package}
            onChange={(v) => setForm((s) => ({ ...s, expected_package: v }))}
          />
          <Field
            label="Application deadline"
            type="datetime-local"
            value={form.application_deadline}
            onChange={(v) => setForm((s) => ({ ...s, application_deadline: v }))}
          />
        </div>

        <Field
          label="Job description"
          value={form.job_description}
          onChange={(v) => setForm((s) => ({ ...s, job_description: v }))}
        >
          <textarea
            rows={4}
            value={form.job_description}
            onChange={(e) => setForm((s) => ({ ...s, job_description: e.target.value }))}
          />
        </Field>

        <div className="form-divider" />
        <div className="section-headline">
          <div>
            <h3>Eligibility criteria</h3>
            <p>Update the criteria using inputs and selections instead of editing JSON.</p>
          </div>
        </div>
        <div className="form-grid three">
          <Field
            label="Minimum CGPA"
            value={form.min_cgpa}
            onChange={(v) => setForm((s) => ({ ...s, min_cgpa: v }))}
            placeholder="No minimum"
            type="number"
            min="0"
            max="10"
            step="0.1"
          />
          <Field
            label="Maximum active backlogs"
            value={form.max_backlogs}
            onChange={(v) => setForm((s) => ({ ...s, max_backlogs: v }))}
            placeholder="No limit"
            type="number"
            min="0"
          />
          <Field
            label="Maximum education gaps"
            value={form.max_education_gaps}
            onChange={(v) => setForm((s) => ({ ...s, max_education_gaps: v }))}
            placeholder="No limit"
            type="number"
            min="0"
          />
          <Field
            label="Minimum class X (%)"
            value={form.min_tenth_percentage}
            onChange={(v) => setForm((s) => ({ ...s, min_tenth_percentage: v }))}
            placeholder="No minimum"
            type="number"
            min="0"
            max="100"
          />
          <Field
            label="Minimum class XII / Diploma (%)"
            value={form.min_twelfth_percentage}
            onChange={(v) => setForm((s) => ({ ...s, min_twelfth_percentage: v }))}
            placeholder="No minimum"
            type="number"
            min="0"
            max="100"
          />
        </div>

        <div className="form-divider" />
        <div className="option-select-section">
          <div>
            <h3>Eligible branches</h3>
            <p>Select the branches accepted for this drive. Leave all unchecked for no branch restriction.</p>
          </div>
          <div className="check-chip-grid">
            {branchOptions.map((branch) => (
              <label
                key={branch}
                className={`check-chip ${form.allowed_branches.includes(branch) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={form.allowed_branches.includes(branch)}
                  onChange={() => toggleListValue("allowed_branches", branch)}
                />
                <span>
                  {form.allowed_branches.includes(branch) && <Check size={12} />} {branch}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-divider" />
        <div className="option-select-section">
          <div>
            <h3>Eligible passing-year batches</h3>
            <p>Choose the graduation batches that may apply. Leave all unchecked for no batch restriction.</p>
          </div>
          <div className="check-chip-grid">
            {batchOptions.map((batch) => (
              <label
                key={batch}
                className={`check-chip ${form.allowed_batches.includes(batch) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={form.allowed_batches.includes(batch)}
                  onChange={() => toggleListValue("allowed_batches", batch)}
                />
                <span>
                  {form.allowed_batches.includes(batch) && <Check size={12} />} {batch}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-divider" />
        <div className="section-headline">
          <div>
            <h3>Additional eligibility rules</h3>
            <p>Define other criteria using a profile field, operator, and required value.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setForm((s) => ({
              ...s,
              custom_criteria: [...s.custom_criteria, { field: "", operator: ">=", value: "" }],
            }))}
          >
            Add rule
          </Button>
        </div>
        {form.custom_criteria.map((rule, index) => (
          <div className="custom-criteria-row" key={index}>
            <Field
              label="Profile field"
              value={rule.field}
              onChange={(v) => updateCustomRule(index, "field", v)}
              placeholder="e.g. leetcode_rating"
              required
            />
            <Field label="Operator" value={rule.operator} onChange={(v) => updateCustomRule(index, "operator", v)}>
              <select
                value={rule.operator}
                onChange={(e) => updateCustomRule(index, "operator", e.target.value)}
              >
                {ELIGIBILITY_OPERATORS.map((operator) => (
                  <option key={operator.value} value={operator.value}>{operator.label}</option>
                ))}
                {!ELIGIBILITY_OPERATORS.some((operator) => operator.value === rule.operator) && (
                  <option value={rule.operator}>{rule.operator}</option>
                )}
              </select>
            </Field>
            <Field
              label="Required value"
              value={rule.value}
              onChange={(v) => updateCustomRule(index, "value", v)}
              placeholder={rule.operator === "in" ? "e.g. CSE, CSA" : "e.g. 1200"}
              required
            />
            <IconButton
              icon={Trash2}
              title="Remove eligibility rule"
              danger
              onClick={() => setForm((s) => ({
                ...s,
                custom_criteria: s.custom_criteria.filter((_, i) => i !== index),
              }))}
            />
          </div>
        ))}

        <div className="notice warning">
          <ShieldCheck size={16} /> Only fields accepted by the superadmin override API are submitted. Structured descriptions remain in the drive metadata.
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Apply override"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ForceApplyModal({ drive, api, notify, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_identifier: "",
    resume_file_id: "",
    google_drive_resume_url: "",
    remarks: "Superadmin emergency manual registration",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!form.student_identifier.trim()) {
      notify("Enter a student BT ID, UUID, or college email.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student_identifier: form.student_identifier.trim(),
        remarks: form.remarks || null,
      };
      if (form.resume_file_id.trim())
        payload.resume_file_id = form.resume_file_id.trim();
      if (form.google_drive_resume_url.trim())
        payload.google_drive_resume_url = form.google_drive_resume_url.trim();
      await api(`/api/superadmin/drives/${drive.id}/force-apply`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notify(`Manual application registered for ${drive.company_name}.`);
      onSaved();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Force-apply a student"
      description={`${drive.company_name} · ${drive.role_title}`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <Field
          label="Student identifier"
          value={form.student_identifier}
          onChange={(v) => setForm((s) => ({ ...s, student_identifier: v }))}
          placeholder="BT25CSA016 or student@iiitn.ac.in"
          required
        />
        <Field
          label="Resume file ID (optional)"
          value={form.resume_file_id}
          onChange={(v) => setForm((s) => ({ ...s, resume_file_id: v }))}
          hint="Use a file ID only after verifying the student's document."
        />
        <Field
          label="Google Drive resume URL (optional)"
          value={form.google_drive_resume_url}
          onChange={(v) =>
            setForm((s) => ({ ...s, google_drive_resume_url: v }))
          }
          placeholder="https://drive.google.com/..."
        />
        <Field
          label="Reason / remarks"
          value={form.remarks}
          onChange={(v) => setForm((s) => ({ ...s, remarks: v }))}
          required
        />
        <div className="notice warning">
          <CircleAlert size={16} /> This bypasses the regular student workflow
          and should only be used for an approved exception.
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registering…" : "Register application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
