import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Pencil,
  CircleAlert,
  BadgeCheck,
  KeyRound,
  UserRound,
  LogOut,
  Phone,
  Shield,
  Building2,
} from "lucide-react";
import { useState } from "react";
import {
  Avatar,
  PageTitle,
  Field,
  Button,
  StatusBadge,
} from "../../components/ui.jsx";

export function AdminProfile({
  profile,
  user,
  api,
  notify,
  logout,
  isSuperadmin = false,
}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile.phone_number || "");
  const [saving, setSaving] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    if (phone && !/^\+?[0-9 ()-]{10,15}$/.test(phone)) {
      notify("Enter a valid phone number.", "error");
      return;
    }
    setSaving(true);
    try {
      if (phone.trim() !== (profile.phone_number || "")) {
        await api("/api/students/profile", {
          method: "PATCH",
          body: JSON.stringify({ phone_number: phone.trim() }),
        });
      }
      notify("Profile details updated successfully.");
      setEditing(false);
      location.reload();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const roleName = isSuperadmin
    ? "Super Administrator"
    : "Placement Administrator";
  const roleEyebrow = isSuperadmin
    ? "SYSTEM GOVERNANCE"
    : "PLACEMENT ADMINISTRATION";

  const infoFields = [
    ["Full name", profile.full_name || "Administrator"],
    ["Official email", user?.email || profile.email],
    ["BT ID / Identifier", profile.bt_id || "Staff / Officer"],
    ["Assigned role", roleName],
    ["Department / Branch", profile.branch || "Training & Placement Cell"],
    ["Institution", "IIIT Nagpur"],
    [
      "Access permissions",
      isSuperadmin
        ? "Full platform control & governance"
        : "Placement drive & candidate management",
    ],
    ["Account status", "Active & verified"],
  ];

  const permissionsList = isSuperadmin
    ? [
        "Superadmin privilege over student directory",
        "Manage admin roles & assign permissions",
        "Override drive & application statuses",
        "View comprehensive system logs & audit trails",
        "Full database synchronization & maintenance",
      ]
    : [
        "Create, update and manage placement drives",
        "Screen & review student applicants",
        "Configure recruitment selection rounds",
        "View active student profiles & placement analytics",
        "Export candidate rosters and round results",
      ];

  return (
    <>
      <PageTitle
        eyebrow={roleEyebrow}
        title="Admin profile"
        description="Your verified administrative identity, privileges, and contact information."
        actions={
          <Button
            variant="outline"
            icon={Pencil}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel editing" : "Edit contact details"}
          </Button>
        }
      />

      <div className="profile-hero-panel">
        <div className="profile-hero-avatar">
          <Avatar name={profile.full_name || user?.email} size="xxl" />
          <span
            className="verified-check"
            style={{ background: isSuperadmin ? "#7c3aed" : "#1668FE" }}
          >
            <Check size={13} />
          </span>
        </div>
        <div className="profile-hero-copy">
          <div
            className="eyebrow"
            style={{ color: isSuperadmin ? "#7c3aed" : "var(--primary)" }}
          >
            {isSuperadmin ? "SUPERADMIN PROFILE" : "PLACEMENT ADMIN PROFILE"}
          </div>
          <h2>{profile.full_name || user?.email?.split("@")[0]}</h2>
          <p>{user?.email || profile.email}</p>
          <div className="profile-hero-tags">
            <span>
              <BadgeCheck size={14} /> College verified
            </span>
            <span>
              <ShieldCheck size={14} /> {roleName}
            </span>
            <span>
              <Building2 size={14} /> IIIT Nagpur
            </span>
            {profile.bt_id && (
              <span>
                <UserRound size={14} /> {profile.bt_id}
              </span>
            )}
          </div>
        </div>
        <div className="profile-completeness">
          <div className="admin-role-badge-box">
            <Shield
              size={24}
              style={{ color: isSuperadmin ? "#7c3aed" : "var(--primary)" }}
            />
            <StatusBadge status={isSuperadmin ? "selected" : "shortlisted"}>
              {isSuperadmin ? "Superadmin" : "Admin"}
            </StatusBadge>
          </div>
        </div>
      </div>

      {editing && (
        <section className="panel edit-profile-panel">
          <div className="panel-heading">
            <div>
              <h2>Edit contact details</h2>
              <p>Update your phone number for administrative correspondence.</p>
            </div>
          </div>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <Field
                label="Contact phone number"
                value={phone}
                onChange={setPhone}
                placeholder="+91 98765 43210"
                hint="Used for emergency candidate notifications and recruitment alerts."
              />
            </div>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="profile-body-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Administrator details</h2>
              <p>Verified staff and officer credentials</p>
            </div>
            <ShieldCheck size={20} className="muted-icon" />
          </div>
          <div className="profile-fields-grid">
            {infoFields.map(([label, value]) => (
              <div className="profile-field" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "18px 22px 22px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 800,
                marginBottom: "12px",
                color: "var(--navy)",
              }}
            >
              Authorized system capabilities
            </h3>
            <div style={{ display: "grid", gap: "8px" }}>
              {permissionsList.map((perm) => (
                <div
                  key={perm}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  <CheckCircle2
                    size={15}
                    style={{ color: "#10b981", flexShrink: 0 }}
                  />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel account-panel">
          <div className="panel-heading">
            <div>
              <h2>Account & security</h2>
              <p>Your authenticated session</p>
            </div>
            <ShieldCheck size={20} className="muted-icon" />
          </div>
          <div className="account-security-row">
            <div className="security-icon green">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <b>College account authenticated</b>
              <p>Google identity · Supabase session</p>
            </div>
          </div>
          <div className="account-security-row">
            <div className="security-icon blue">
              <Mail size={18} />
            </div>
            <div>
              <b>{user?.email}</b>
              <p>Primary official email</p>
            </div>
          </div>
          <div className="account-security-row">
            <div className="security-icon orange">
              <KeyRound size={18} />
            </div>
            <div>
              <b>{roleName}</b>
              <p>
                {isSuperadmin ? "Level 2 privileges" : "Level 1 privileges"}
              </p>
            </div>
          </div>
          <div className="account-notice">
            <CircleAlert size={16} />
            <span>
              Role changes take effect upon re-authentication. For access
              modifications, contact the superadmin.
            </span>
          </div>
          <Button
            variant="danger-outline"
            icon={LogOut}
            block
            onClick={() => {
              if (window.confirm("Sign out of the TNP portal?"))
                logout("You have signed out.");
            }}
          >
            Sign out of this device
          </Button>
        </aside>
      </div>
    </>
  );
}
