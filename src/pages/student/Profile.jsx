import { Check, CheckCircle2, GraduationCap, LogOut, Mail, ShieldCheck, UserRound, Pencil, CircleAlert, BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { Avatar, PageTitle, Field, Button } from '../../components/ui.jsx'

export function StudentProfile({ profile, user, api, notify, logout }) {
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(profile.phone_number || '')
  const [resumeUrl, setResumeUrl] = useState(profile.google_drive_resume_url || '')
  const [saving, setSaving] = useState(false)
  async function saveProfile(e) {
    e.preventDefault()
    if (phone && !/^\+?[0-9 ()-]{10,15}$/.test(phone)) { notify('Enter a valid phone number.', 'error'); return }
    setSaving(true)
    try {
      const phoneChanged = phone.trim() !== (profile.phone_number || '')
      const resumeChanged = resumeUrl.trim() !== (profile.google_drive_resume_url || '')
      if (phoneChanged && phone.trim()) {
        await api('/api/students/profile', { method: 'PATCH', body: JSON.stringify({ phone_number: phone.trim() }) })
      }
      if (resumeChanged && resumeUrl.trim()) {
        await api('/api/students/resume-url', { method: 'PATCH', body: JSON.stringify({ google_drive_resume_url: resumeUrl.trim() }) })
      }
      if (resumeChanged && !resumeUrl.trim() && profile.google_drive_resume_url) {
        notify('The backend does not provide an endpoint to clear the saved resume URL. Enter a replacement URL or leave the existing one unchanged.', 'error')
        return
      }
      notify('Profile details saved.'); setEditing(false); location.reload()
    } catch (error) { notify(error.message, 'error') } finally { setSaving(false) }
  }
  const items = [
    ['Full name', profile.full_name], ['College email', user?.email || profile.email], ['BT ID', profile.bt_id], ['Branch', profile.branch], ['Batch', profile.batch || profile.passing_year], ['CGPA', profile.cgpa], ['Active backlogs', profile.active_backlogs ?? profile.backlogs], ['Tenth percentage', profile.tenth_percentage != null ? `${profile.tenth_percentage}%` : '—'], ['Twelfth / Diploma', profile.twelfth_percentage != null ? `${profile.twelfth_percentage}%` : '—'], ['Education gaps', profile.education_gaps],
  ]
  return <><PageTitle eyebrow="YOUR COLLEGE IDENTITY" title="My profile" description="Your verified academic details and the contact information used throughout the placement process." actions={<Button variant="outline" icon={Pencil} onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit contact details'}</Button>}/><div className="profile-hero-panel"><div className="profile-hero-avatar"><Avatar name={profile.full_name || user?.email} size="xxl"/><span className="verified-check"><Check size={13}/></span></div><div className="profile-hero-copy"><div className="eyebrow">VERIFIED STUDENT PROFILE</div><h2>{profile.full_name || 'IIIT Nagpur Student'}</h2><p>{user?.email || profile.email}</p><div className="profile-hero-tags"><span><BadgeCheck size={14}/> College verified</span><span><GraduationCap size={14}/>{profile.branch || 'Branch not set'}</span>{profile.bt_id && <span><UserRound size={14}/>{profile.bt_id}</span>}</div></div><div className="profile-completeness"><div className="completeness-ring"><span>{Math.round(items.filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== '').length / items.length * 100)}%</span></div><span>Profile info</span></div></div>{editing && <section className="panel edit-profile-panel"><div className="panel-heading"><div><h2>Contact information</h2><p>Academic details are maintained by the placement administration.</p></div></div><form onSubmit={saveProfile}><div className="form-grid"><Field label="Phone number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" required/><Field label="Google Drive resume URL" value={resumeUrl} onChange={setResumeUrl} placeholder="https://drive.google.com/..." hint="Optional. Ensure link access is set to anyone with the link."/></div><div className="modal-actions"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div></form></section>}<div className="profile-body-grid"><section className="panel"><div className="panel-heading"><div><h2>Academic information</h2><p>Verified information from the college student directory</p></div><ShieldCheck size={20} className="muted-icon"/></div><div className="profile-fields-grid">{items.map(([label, value]) => <div className="profile-field" key={label}><span>{label}</span><b>{value !== null && value !== undefined && value !== '' ? value : 'Not available'}</b></div>)}</div></section><aside className="panel account-panel"><div className="panel-heading"><div><h2>Account & security</h2><p>Your sign-in identity</p></div><ShieldCheck size={20} className="muted-icon"/></div><div className="account-security-row"><div className="security-icon green"><CheckCircle2 size={18}/></div><div><b>College account authenticated</b><p>Google identity · Supabase session</p></div></div><div className="account-security-row"><div className="security-icon blue"><Mail size={18}/></div><div><b>{user?.email}</b><p>Primary sign-in email</p></div></div><div className="account-notice"><CircleAlert size={16}/><span>Academic information is read-only here. For corrections, contact the Training & Placement Cell.</span></div><Button variant="danger-outline" icon={LogOut} block onClick={() => { if (window.confirm('Sign out of the TNP portal?')) logout('You have signed out.') }}>Sign out of this device</Button></aside></div></>
}
