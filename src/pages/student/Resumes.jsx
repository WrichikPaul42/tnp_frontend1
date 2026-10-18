import {
  Check,
  CheckCircle2,
  FileText,
  Mail,
  ShieldCheck,
  Upload,
  // Eye,
  Download,
  Trash2,
  // Pencil,
  // BadgeCheck,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  niceDate,
  EmptyState,
  PageTitle,
  Skeleton,
  Button,
  IconButton,
  useData,
  LoadPanel,
} from "../../components/ui.jsx";
import { MAX_PDF_BYTES } from "../../config.js";

export function StudentFiles({ api, notify }) {
  const state = useData(api, "/storage/profile/files");
  const [activeTab, setActiveTab] = useState("resume");
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef(null);
  const raw = state.data || {};
  const files = raw.files || [
    ...(raw.resumes || []),
    ...(raw.cover_letters || []),
  ];
  const resumes = files.filter(
    (f) =>
      f.file_type === "resume" ||
      (!f.file_type && f.filename?.toLowerCase().includes("resume")),
  );
  const letters = files.filter(
    (f) =>
      f.file_type === "cover_letter" ||
      f.filename?.toLowerCase().includes("coverletter"),
  );
  const current = activeTab === "resume" ? resumes : letters;
  async function upload(file) {
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      notify("Please choose a PDF file.", "error");
      return;
    }
    const limit = MAX_PDF_BYTES;
    if (file.size > limit) {
      notify(
        `The ${activeTab === "resume" ? "resume" : "cover letter"} must be 2 MB or smaller.`,
        "error",
      );
      return;
    }
    setUploading(true);
    try {
      const type = activeTab === "resume" ? "resume" : "cover_letter";
      const { data: start } = await api("/storage/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mime_type: "application/pdf",
          file_type: type,
          size_bytes: file.size,
          is_profile_file: true,
        }),
      });
      const fileId = start.file_id || start.id;
      const pendingToken = start.pending_token;
      if (!start.upload_url || (!fileId && !pendingToken))
        throw new Error(
          "The upload service did not return the expected upload URL or upload token.",
        );
      const put = await fetch(start.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
          ...(start.headers || {}),
        },
        body: file,
      });
      if (!put.ok)
        throw new Error(`Upload to secure storage failed (${put.status}).`);
      await api("/storage/complete-upload", {
        method: "POST",
        body: JSON.stringify(
          fileId ? { file_id: fileId } : { pending_token: pendingToken },
        ),
      });
      notify(
        `${type === "resume" ? "Resume" : "Cover letter"} uploaded successfully.`,
      );
      setFileInputKey((k) => k + 1);
      state.reload();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setUploading(false);
    }
  }
  async function viewFile(file) {
    try {
      const { data } = await api(`/storage/files/${file.id}/view`);
      const url = data.download_url || data.url;
      if (!url) throw new Error("A secure viewing link was not returned.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(error.message, "error");
    }
  }
  async function deleteFile(file) {
    if (
      !window.confirm(
        `Delete ${file.filename}? Files attached to submitted applications may be locked.`,
      )
    )
      return;
    try {
      await api(`/storage/files/${file.id}`, { method: "DELETE" });
      notify("File deleted.");
      state.reload();
    } catch (error) {
      notify(error.message, "error");
    }
  }
  async function setDefault(file) {
    try {
      await api(`/storage/files/${file.id}/default`, { method: "POST" });
      notify("Default resume updated.");
      state.reload();
    } catch (error) {
      notify(error.message, "error");
    }
  }
  async function renameToBtid(file) {
    try {
      await api(`/storage/files/${file.id}/rename-to-btid`, { method: "POST" });
      notify("Resume filename standardized to your BT ID.");
      state.reload();
    } catch (error) {
      notify(error.message, "error");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR DOCUMENTS"
        title="Resumes & cover letters"
        description="Keep your documents ready. Your default resume is used when applying to eligible drives."
        actions={
          <Button
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
            disabled={
              uploading ||
              (activeTab === "resume"
                ? resumes.length >= 3
                : letters.length >= 1)
            }
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
        }
      />
      <input
        key={fileInputKey}
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <div className="document-banner">
        <div className="document-banner-icon">
          <ShieldCheck size={23} />
        </div>
        <div>
          <b>Your documents stay secure</b>
          <p>
            PDF only · Resumes up to 2 MB · Maximum 3 resumes and 1 cover
            letter. Resume files used for applications cannot be deleted.
          </p>
        </div>
        <div className="document-usage">
          <span>Resumes</span>
          <b>
            {resumes.length}
            <small>/3</small>
          </b>
          <div className="usage-track">
            <i
              style={{ width: `${Math.min(100, (resumes.length / 3) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="document-layout">
        <section className="panel document-main">
          <div className="document-tabs">
            <button
              className={activeTab === "resume" ? "active" : ""}
              onClick={() => setActiveTab("resume")}
            >
              <FileText size={16} /> Resumes <span>{resumes.length}</span>
            </button>
            <button
              className={activeTab === "letter" ? "active" : ""}
              onClick={() => setActiveTab("letter")}
            >
              <Mail size={16} /> Cover letter <span>{letters.length}</span>
            </button>
          </div>
          {state.loading ? (
            <Skeleton rows={3} />
          ) : state.error ? (
            <LoadPanel state={state} onRetry={state.reload} />
          ) : current.length ? (
            <div className="document-file-list">
              {current.map((file) => (
                <article className="document-file" key={file.id}>
                  <div className="pdf-thumb">
                    <FileText size={26} />
                    <span>PDF</span>
                  </div>
                  <div className="document-file-info">
                    <div className="document-file-name">
                      {file.filename}
                      {(file.is_default ||
                        file.is_primary ||
                        file.is_default_resume) && (
                        <span className="default-tag">
                          <Check size={11} /> Default
                        </span>
                      )}
                    </div>
                    <p>
                      {(file.size_bytes / 1024).toFixed(0)} KB · Added{" "}
                      {niceDate(file.created_at)}
                    </p>
                    <div className="document-file-status">
                      {file.used_for_application && (
                        <span>
                          <LockIcon /> In use by an application
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="document-file-actions">
                    <IconButton
                      icon={Download}
                      title="View PDF"
                      onClick={() => viewFile(file)}
                    />
                    {/* {activeTab === "resume" && (
                      <IconButton
                        icon={Pencil}
                        title="Standardize filename to BT ID"
                        onClick={() => renameToBtid(file)}
                      />
                    )} */}
                    {/* {activeTab === "resume" &&
                      !(
                        file.is_default ||
                        file.is_primary ||
                        file.is_default_resume
                      ) && (
                        <IconButton
                          icon={BadgeCheck}
                          title="Set as default resume"
                          onClick={() => setDefault(file)}
                        />
                      )} */}
                    <IconButton
                      icon={Trash2}
                      title="Delete file"
                      onClick={() => deleteFile(file)}
                      danger={Boolean(file.used_for_application)}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={activeTab === "resume" ? FileText : Mail}
              title={
                activeTab === "resume"
                  ? "Your resume library is empty"
                  : "No cover letter uploaded"
              }
              description={
                activeTab === "resume"
                  ? "Upload a polished PDF resume so you can apply to placement drives in just a few clicks."
                  : "A tailored cover letter can help you introduce yourself to recruiters."
              }
            />
          )}
          <div className="document-panel-footer">
            <span>
              {activeTab === "resume"
                ? `${resumes.length} of 3 resumes`
                : `${letters.length} of 1 cover letter`}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              disabled={
                uploading ||
                (activeTab === "resume"
                  ? resumes.length >= 3
                  : letters.length >= 1)
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {activeTab === "resume" ? "Add resume" : "Upload cover letter"}
            </Button>
          </div>
        </section>
        <aside className="document-side">
          <div className="document-side-illustration">
            <div className="floating-paper paper-a">
              <FileText size={20} />
              <span />
              <span />
            </div>
            <div className="floating-paper paper-b">
              <CheckCircle2 size={23} />
              <span>ATS ready</span>
            </div>
            <div className="document-circle">
              <FileText size={44} />
            </div>
          </div>
          <h3>Recruiter-ready starts here</h3>
          <p>
            Keep your resume current, choose your default version, and make
            every application count.
          </p>
          <div className="checklist-row">
            <CheckCircle2 size={17} />
            <span>PDF, clean and readable</span>
          </div>
          <div className="checklist-row">
            <CheckCircle2 size={17} />
            <span>Filename standardized by BTID</span>
          </div>
          <div className="checklist-row">
            <CheckCircle2 size={17} />
            <span>One default resume selected</span>
          </div>
        </aside>
      </div>
    </>
  );
}
function LockIcon() {
  return <ShieldCheck size={12} />;
}
