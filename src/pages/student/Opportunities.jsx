import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, FileText, MoreHorizontal, RefreshCw, ShieldCheck, XCircle, CircleAlert } from 'lucide-react'
import { useState, useEffect } from 'react'
import { niceDate, initials, dataOf, StatusBadge, EmptyState, PageTitle, Skeleton, Field, Button, Modal, useData, LoadPanel } from '../../components/ui.jsx'

export function StudentOpportunities({ api, notify, profile, params, refreshKey, setRefreshKey }) {
  const state = useData(api, '/api/students/jobs', String(refreshKey))
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [rejectConfirm, setRejectConfirm] = useState(null)
  const [applyDialog, setApplyDialog] = useState(null)
  const [customFields, setCustomFields] = useState({})
  const [resumes, setResumes] = useState([])
  const [resumeId, setResumeId] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const jobs = dataOf(state.data, 'jobs')
  useEffect(() => { if (params?.selectedJob && jobs.length) { const j = jobs.find(x => x.id === params.selectedJob); if (j) setSelected(j) } }, [params, jobs])
  const filtered = jobs.filter(j => filter === 'all' || (filter === 'new' ? !j.has_applied : j.has_applied))
  async function beginApply(job) {
    try {
      const { data } = await api(`/api/applications/check-requirements/${job.id}?student_id=${encodeURIComponent(profile.id || '')}`)
      if (data.is_primary_eligible === false) { notify((data.reasons || ['You do not meet the requirements for this drive.']).join(' '), 'error'); return }
      const missing = data.missing_fields || []
      if (missing.length) { setCustomFields(Object.fromEntries(missing.map(f => [f.field || f.name || f.label, '']))); setApplyDialog({ job, missing }); return }
      await continueApply(job, {})
    } catch (error) { notify(error.message, 'error') }
  }
  async function continueApply(job, fields) {
    setResumeLoading(true)
    try {
      const { data: files } = await api('/storage/profile/files')
      const fileList = [...(files.files || files.resumes || []), ...(files.cover_letters || [])].filter(f => f.file_type === 'resume' || !f.file_type)
      const defaultResume = fileList.find(f => f.is_default || f.is_primary || f.is_default_resume) || fileList[0]
      setResumes(fileList); setResumeId(defaultResume?.id || '')
      setApplyDialog({ job, missing: [], fields, pickResume: true })
    } catch (error) { notify(error.message, 'error') } finally { setResumeLoading(false) }
  }
  async function submitApply() {
    if (!applyDialog?.job) return
    try {
      await api('/api/applications/apply', { method: 'POST', body: JSON.stringify({ student_id: profile.id, job_id: applyDialog.job.id, resume_file_id: resumeId || null, google_drive_resume_url: profile.google_drive_resume_url || null, custom_fields: applyDialog.fields || {} }) })
      notify(`Application submitted to ${applyDialog.job.company_name}.`); setApplyDialog(null); setSelected(null); setRefreshKey(v => v + 1); state.reload()
    } catch (error) { notify(error.message, 'error') }
  }
  async function rejectJob(job) {
    try { await api('/api/applications/reject', { method: 'POST', body: JSON.stringify({ student_id: profile.id, job_id: job.id }) }); notify(`Hidden ${job.company_name} from your opportunities.`); setRejectConfirm(null); setSelected(null); state.reload() }
    catch (error) { notify(error.message, 'error') }
  }
  return <>
    <PageTitle eyebrow="FIND YOUR NEXT MOVE" title="Opportunities" description="Explore placement drives you're eligible for, review the details, and apply when you're ready." actions={<Button variant="outline" icon={RefreshCw} onClick={state.reload}>Refresh list</Button>}/>
    <div className="opportunity-toolbar"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All opportunities <span>{jobs.length}</span></button><button className={filter === 'new' ? 'active' : ''} onClick={() => setFilter('new')}>Not applied <span>{jobs.filter(j => !j.has_applied).length}</span></button><button className={filter === 'applied' ? 'active' : ''} onClick={() => setFilter('applied')}>Applied <span>{jobs.filter(j => j.has_applied).length}</span></button></div><div className="toolbar-note"><ShieldCheck size={15}/> Only eligible drives are shown</div></div>
    {state.loading ? <div className="opportunity-grid">{Array.from({ length: 4 }).map((_, i) => <div className="panel" key={i}><Skeleton rows={3}/></div>)}</div> : state.error ? <LoadPanel state={state} onRetry={state.reload}/> : filtered.length ? <div className="opportunity-grid">{filtered.map(job => <OpportunityCard key={job.id} job={job} onOpen={() => setSelected(job)} onApply={() => beginApply(job)} disabled={resumeLoading}/>)}</div> : <div className="panel"><EmptyState icon={BriefcaseBusiness} title="No opportunities in this view" description="Try another filter or check back when new placement drives are posted."/></div>}
    {selected && <JobDetailsModal job={selected} onClose={() => setSelected(null)} onApply={() => beginApply(selected)} onReject={() => setRejectConfirm(selected)}/>}
    {rejectConfirm && <Modal title="Hide this opportunity?" description={`${rejectConfirm.company_name} · ${rejectConfirm.job_title || rejectConfirm.role_title}`} onClose={() => setRejectConfirm(null)}><p className="modal-copy">This will record your decision and remove the drive from your opportunity feed. You can’t undo this from the student dashboard.</p><div className="modal-actions"><Button variant="outline" onClick={() => setRejectConfirm(null)}>Cancel</Button><Button variant="danger" icon={XCircle} onClick={() => rejectJob(rejectConfirm)}>Hide opportunity</Button></div></Modal>}
    {applyDialog && <Modal title={applyDialog.pickResume ? 'Choose your resume' : 'A few details first'} description={applyDialog.job ? `${applyDialog.job.company_name} · ${applyDialog.job.job_title || applyDialog.job.role_title}` : ''} wide onClose={() => setApplyDialog(null)}>{applyDialog.missing?.length > 0 && !applyDialog.pickResume ? <><p className="modal-copy">This drive needs a few additional details. Fill them in accurately before applying.</p><div className="form-grid">{applyDialog.missing.map(field => { const key = field.field || field.name || field.label; return <Field key={key} label={field.label || field.name || key} value={customFields[key] || ''} onChange={value => setCustomFields(old => ({ ...old, [key]: value }))} placeholder={field.description || `Enter ${field.label || key}`} required/> })}</div><div className="modal-actions"><Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button><Button onClick={() => continueApply(applyDialog.job, customFields)}>Continue <ArrowRight size={15}/></Button></div></> : <><p className="modal-copy">Your selected resume will be attached to the application and locked from deletion while in use.</p>{resumes.length ? <div className="resume-choice-list">{resumes.map(file => <label key={file.id} className={`resume-choice ${resumeId === file.id ? 'selected' : ''}`}><input type="radio" checked={resumeId === file.id} onChange={() => setResumeId(file.id)} name="resume"/><span className="file-icon"><FileText size={20}/></span><span><b>{file.filename}</b><small>{file.is_default || file.is_primary || file.is_default_resume ? 'Default resume · ' : ''}{(file.size_bytes / 1024).toFixed(0)} KB</small></span>{resumeId === file.id && <CheckCircle2 size={19}/>}</label>)}</div> : <div className="notice warning"><CircleAlert size={17}/> No uploaded resume was found. Upload one first, or add a Google Drive resume link in your profile.</div>}<div className="modal-actions"><Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button>{!resumes.length && <Button variant="outline" onClick={() => { setApplyDialog(null); setSelected(null) }}>Manage resumes</Button>}<Button icon={CheckCircle2} disabled={!resumes.length || !resumeId} onClick={submitApply}>Submit application</Button></div></>}</Modal>}
  </>
}
function OpportunityCard({ job, onOpen, onApply, disabled }) {
  const pkg = job.expected_package || 'Package not disclosed'
  return <article className="opportunity-card"><div className="opportunity-card-top"><div className="company-avatar large">{initials(job.company_name)}</div><div className="opportunity-card-tags"><span className="eligible-tag"><CheckCircle2 size={13}/> Eligible</span>{job.has_applied && <StatusBadge status="applied"/>}</div><button className="more-button" title="View details" onClick={onOpen}><MoreHorizontal size={19}/></button></div><h3>{job.company_name}</h3><p className="opportunity-role">{job.job_title || job.role_title || 'Campus opportunity'}</p><div className="job-detail-line"><span><Building2 size={15}/>{job.is_job === false ? 'Internship' : 'Full-time role'}</span><span><CalendarDays size={15}/>{job.application_deadline ? `Closes ${niceDate(job.application_deadline)}` : 'Deadline TBA'}</span></div><div className="package-box"><span>Expected package</span><strong>{pkg}</strong></div><p className="job-desc-preview">{job.job_description || 'Explore the role requirements, package details, and selection process.'}</p><div className="opportunity-card-footer"><Button variant="outline" onClick={onOpen}>View details</Button><Button disabled={disabled || job.has_applied} onClick={onApply} icon={job.has_applied ? Check : ArrowRight}>{job.has_applied ? 'Applied' : 'Apply now'}</Button></div></article>
}
function JobDetailsModal({ job, onClose, onApply, onReject }) {
  const sections = Array.isArray(job.description_sections) ? job.description_sections : []
  const rounds = Array.isArray(job.rounds) ? job.rounds : []
  return <Modal title={job.company_name} description={job.job_title || job.role_title || 'Placement opportunity'} wide onClose={onClose}><div className="job-details-hero"><div className="company-avatar large">{initials(job.company_name)}</div><div><h3>{job.company_name}</h3><p>{job.job_title || job.role_title}</p><div className="job-details-tags"><span className="eligible-tag"><CheckCircle2 size={13}/> Eligible for you</span>{job.has_applied && <StatusBadge status="applied"/>}</div></div><div className="job-package-big"><small>Expected package</small><b>{job.expected_package || 'Not disclosed'}</b></div></div><div className="job-details-content"><div className="job-details-column"><h4>About this opportunity</h4><p className="details-body">{job.job_description || 'No additional role description was provided.'}</p>{sections.length > 0 ? <div className="detail-accordions">{sections.map((section, i) => <details key={`${section.heading}-${i}`} open={i === 0}><summary>{section.heading || 'Details'}<ChevronDown size={16}/></summary><div className="section-detail-content">{section.content && <p>{section.content}</p>}{Array.isArray(section.subfields) && section.subfields.map((sf, j) => <div className="subfield-row" key={j}><span>{sf.label}</span><b>{sf.value || '—'}</b></div>)}</div></details>)}</div> : null}</div><div className="job-details-column"><h4>Recruitment at a glance</h4><div className="detail-fact"><span>Application deadline</span><b>{niceDate(job.application_deadline)}</b></div><div className="detail-fact"><span>Eligibility</span><b className="text-green">Meets listed criteria</b></div>{rounds.length > 0 && <><h4 className="round-section-heading">Selection rounds</h4><div className="round-timeline">{rounds.map((round, index) => <div className="timeline-item" key={round.round_id || round.id || index}><div className="timeline-dot">{index + 1}</div><div><b>{round.round_name || `Round ${round.round_number || index + 1}`}</b><p>{round.round_mode || 'Mode TBA'} · {niceDate(round.round_datetime, true)}</p>{round.syllabus && <small>{round.syllabus}</small>}</div></div>)}</div></>}</div></div><div className="modal-actions details-actions"><Button variant="text" onClick={onReject}>Not interested</Button><Button variant="outline" onClick={onClose}>Close details</Button><Button disabled={job.has_applied} icon={ArrowRight} onClick={onApply}>{job.has_applied ? 'Application submitted' : 'Apply to this drive'}</Button></div></Modal>
}
