import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, Bell, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck, UserRound, Users, PanelLeftClose, ChartNoAxesCombined, ListChecks } from 'lucide-react'
import './App.css'
import { API_BASE, GOOGLE_CLIENT_ID, COLLEGE_DOMAIN, loadGoogleIdentityServices, hashNonce } from './config.js'
import { Avatar, Toast, niceDate, readError, getProfile, dataOf, EmptyState } from './components/ui.jsx'
import { LoginScreen } from './components/LoginScreen.jsx'
import { StudentDashboard } from './pages/student/Overview.jsx'
import { StudentOpportunities } from './pages/student/Opportunities.jsx'
import { StudentTracker } from './pages/student/Tracker.jsx'
import { StudentFiles } from './pages/student/Resumes.jsx'
import { NotificationsPage } from './pages/student/Notifications.jsx'
import { StudentProfile } from './pages/student/Profile.jsx'
import { AdminDashboard } from './pages/admin/Overview.jsx'
import { AdminDrives } from './pages/admin/Drives.jsx'
import { CreateDrive } from './pages/admin/CreateDrive.jsx'
import { AdminApplicants } from './pages/admin/Applicants.jsx'
import { ManageRounds } from './pages/admin/Rounds.jsx'
import { ActiveStudents } from './pages/admin/ActiveStudents.jsx'
import { AdminAnalytics } from './pages/admin/Analytics.jsx'
import { AdminLogs } from './pages/admin/Logs.jsx'
import { SuperadminDashboard } from './pages/superadmin/Overview.jsx'
import { SuperadminStudents } from './pages/superadmin/Students.jsx'
import { SuperadminAdmins } from './pages/superadmin/Admins.jsx'
import { SuperadminDrives } from './pages/superadmin/Drives.jsx'
import { SuperadminApplications } from './pages/superadmin/Applications.jsx'
const NAV = {
  student: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace' },
    { id: 'opportunities', label: 'Opportunities', icon: BriefcaseBusiness, group: 'Workspace' },
    { id: 'tracker', label: 'Application tracker', icon: ListChecks, group: 'Workspace' },
    { id: 'resumes', label: 'Resumes & letters', icon: FileText, group: 'My profile' },
    { id: 'notifications', label: 'Notifications', icon: Bell, group: 'My profile' },
    { id: 'profile', label: 'My profile', icon: UserRound, group: 'My profile' },
  ],
  admin: [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
    { id: 'drives', label: 'Placement drives', icon: BriefcaseBusiness, group: 'Recruitment' },
    { id: 'create-drive', label: 'Create a drive', icon: Plus, group: 'Recruitment' },
    { id: 'applicants', label: 'Applicants', icon: Users, group: 'Recruitment' },
    { id: 'rounds', label: 'Manage rounds', icon: ListChecks, group: 'Recruitment' },
    { id: 'active-students', label: 'Active students', icon: GraduationCap, group: 'Insights' },
    { id: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined, group: 'Insights' },
    { id: 'logs', label: 'System logs', icon: Activity, group: 'Administration' },
  ],
  superadmin: [
    { id: 'overview', label: 'System overview', icon: LayoutDashboard, group: 'Workspace' },
    { id: 'students', label: 'Student directory', icon: GraduationCap, group: 'Directory & access' },
    { id: 'admins', label: 'Admins & roles', icon: ShieldCheck, group: 'Directory & access' },
    { id: 'drives', label: 'Drive overrides', icon: BriefcaseBusiness, group: 'Overrides' },
    { id: 'applications', label: 'Application overrides', icon: ClipboardCheck, group: 'Overrides' },
    { id: 'audit-logs', label: 'Audit trail', icon: Activity, group: 'System' },
  ],
}
export default function App({ supabase }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('overview')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewParams, setViewParams] = useState({})
  const [authError, setAuthError] = useState('')
  const [googleAttempt, setGoogleAttempt] = useState(0)
  const googleButtonRef = useRef(null)
  const profileLoadRef = useRef(null)
  const notify = useCallback((message, type = 'success') => setToast({ message, type, id: Date.now() }), [])
  const role = profile?.is_superadmin ? 'superadmin' : profile?.is_admin ? 'admin' : 'student'
  const roleLabel = role === 'superadmin' ? 'Superadmin' : role === 'admin' ? 'Placement admin' : 'Student'
  const logout = useCallback(async (message) => {
    if (supabase) await supabase.auth.signOut().catch(() => {})
    setSession(null); setUser(null); setProfile(null); setPage('overview'); setViewParams({});
    if (message) setToast({ message, type: 'info', id: Date.now() })
  }, [supabase])
  const api = useCallback(async (path, options = {}) => {
    if (!supabase) throw new Error('Supabase configuration is missing. Check your .env file.')
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    const headers = new Headers(options.headers || {})
    if (currentSession?.access_token) headers.set('Authorization', `Bearer ${currentSession.access_token}`)
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    let response
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    } catch (error) {
      const baseHint = import.meta.env.DEV && import.meta.env.VITE_USE_API_PROXY !== 'false'
        ? 'The local API proxy could not reach the backend. Check that the backend URL is correct and the service is awake.'
        : 'The browser could not reach the backend. Check the backend URL, network, and deployed backend CORS settings.'
      throw new Error(`${baseHint}${error?.message ? ` (${error.message})` : ''}`, { cause: error })
    }
    const contentType = response.headers.get('content-type') || ''
    let result = null
    if (contentType.includes('application/json')) result = await response.json().catch(() => ({}))
    else if (!response.ok) result = await response.clone().text().catch(() => '')
    if (response.status === 401) {
      await logout('Your session expired or your role permissions changed. Please sign in again.')
      throw new Error(typeof result === 'object' ? readError(result, 'Authentication expired.') : 'Authentication expired.')
    }
    if (!response.ok) throw new Error(typeof result === 'object' ? readError(result, `Request failed (${response.status})`) : String(result || `Request failed (${response.status})`))
    return { data: result, response }
  }, [supabase, logout])
  const loadProfile = useCallback(async (activeSession) => {
    if (!activeSession || !supabase) { setProfile(null); return null }
    const token = activeSession.access_token
    if (profileLoadRef.current?.token === token) return profileLoadRef.current.promise
    const promise = (async () => {
      try {
        let response
        try {
          response = await fetch(`${API_BASE}/api/students/profile`, { headers: { Authorization: `Bearer ${token}` } })
        } catch (error) {
          const hint = import.meta.env.DEV && import.meta.env.VITE_USE_API_PROXY !== 'false'
            ? 'The local API proxy could not reach the backend. Check the configured backend URL.'
            : 'The browser could not reach the backend. Check your network and backend CORS configuration.'
          throw new Error(`${hint}${error?.message ? ` (${error.message})` : ''}`, { cause: error })
        }
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(readError(data, `Could not load your placement profile (HTTP ${response.status}).`))
        const nextProfile = getProfile(data)
        if (!nextProfile?.id && !nextProfile?.email) throw new Error('The backend returned an empty student profile. Contact the T&P Cell if your college account should have access.')
        setProfile(nextProfile)
        setAuthError('')
        return nextProfile
      } catch (error) {
        setProfile(null)
        setAuthError(error.message || 'Unable to verify your college account.')
        await supabase.auth.signOut().catch(() => {})
        throw error
      }
    })()
    profileLoadRef.current = { token, promise }
    try {
      return await promise
    } finally {
      if (profileLoadRef.current?.token === token) profileLoadRef.current = null
    }
  }, [supabase])
  useEffect(() => {
    let alive = true
    if (!supabase) { setAuthLoading(false); setAuthError('Supabase environment variables are missing.'); return undefined }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session); setUser(data.session?.user || null)
      if (data.session) await loadProfile(data.session)
      if (alive) setAuthLoading(false)
    }).catch(() => { if (alive) setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession); setUser(nextSession?.user || null)
      if (nextSession) queueMicrotask(() => { loadProfile(nextSession).catch(() => {}) })
      else { setProfile(null); profileLoadRef.current = null }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [supabase, loadProfile])
  const signInWithGoogleToken = useCallback(async (credential, nonce) => {
    const claims = decodeJwt(credential)
    const email = String(claims?.email || '').trim().toLowerCase()
    if (!claims?.email_verified || !email.endsWith(COLLEGE_DOMAIN)) {
      const message = !claims?.email_verified
        ? 'Google did not confirm this email address. Choose your verified IIIT Nagpur account.'
        : `Use your official ${COLLEGE_DOMAIN} Google account to continue.`
      setAuthError(message)
      notify(message, 'error')
      setGoogleAttempt(value => value + 1)
      return
    }
    setBusy(true); setAuthError('')
    try {
      if (!supabase) throw new Error('Supabase is not configured. Check the Supabase URL and publishable key in your .env file.')
      // Google receives SHA-256(raw nonce); Supabase receives raw nonce and verifies the corresponding token claim.
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce })
      if (error) throw error
      const signedInEmail = String(data.user?.email || email).trim().toLowerCase()
      if (!signedInEmail.endsWith(COLLEGE_DOMAIN)) {
        await supabase.auth.signOut()
        throw new Error(`Only ${COLLEGE_DOMAIN} accounts are allowed.`)
      }
      if (!data.session) throw new Error('Google authenticated the account but Supabase did not return a session. Check the Google provider configuration in Supabase.')
      setSession(data.session); setUser(data.user)
      await loadProfile(data.session)
      notify('Signed in successfully. Welcome to TNP.')
    } catch (error) {
      const rawMessage = error?.message || 'Google sign-in failed.'
      const message = /nonce/i.test(rawMessage)
        ? 'Google sign-in security check failed (nonce mismatch). Please try again; if it repeats, check the Supabase Google provider configuration.'
        : /audience|aud/i.test(rawMessage)
          ? 'Supabase rejected this Google Web Client ID. Add the exact Client ID to Authentication → Sign In / Providers → Google in the existing TNP Supabase project.'
          : rawMessage
      setAuthError(message); notify(message, 'error')
    } finally {
      setBusy(false)
      setGoogleAttempt(value => value + 1)
    }
  }, [supabase, loadProfile, notify])
  useEffect(() => {
    // The login card is intentionally not mounted until the persisted Supabase
    // session has been checked. Wait for authLoading to finish so this effect
    // runs only after googleButtonRef points at a real DOM node.
    if (authLoading || session || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined
    let cancelled = false
    googleButtonRef.current.innerHTML = ''
    const initialize = async () => {
      try {
        const nonce = createNonce()
        const hashedNonce = await hashNonce(nonce)
        await loadGoogleIdentityServices()
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          hd: 'iiitn.ac.in',
          callback: response => {
            if (response?.credential) signInWithGoogleToken(response.credential, nonce)
            else {
              setAuthError('Google did not return an ID token. Please try again.')
              setGoogleAttempt(value => value + 1)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        })
        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular',
          logo_alignment: 'left', width: Math.min(420, Math.max(240, googleButtonRef.current.clientWidth || 420)),
        })
      } catch (error) {
        if (!cancelled) setAuthError(error?.message || 'Could not initialize Google sign-in. Check your Web Client ID and JavaScript origin.')
      }
    }
    initialize()
    return () => { cancelled = true }
  }, [authLoading, session, signInWithGoogleToken, googleAttempt])
  const openPage = useCallback((nextPage, params = {}) => { setPage(nextPage); setViewParams(params); setSearch(''); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])
  const currentNav = NAV[role] || NAV.student
  useEffect(() => { if (!currentNav.some(item => item.id === page)) setPage('overview') }, [role, page, currentNav])
  if (authLoading) return <div className="loading-screen"><div className="loading-brand"><div className="brand-mark"><GraduationCap size={22}/></div><span>IIIT Nagpur <b>· TNP</b></span></div><div className="loader-ring"/><p>Preparing your placement workspace</p></div>
  if (!session || !profile) return <LoginScreen googleButtonRef={googleButtonRef} busy={busy} error={authError} configured={Boolean(supabase && GOOGLE_CLIENT_ID)} />
  const pageTitle = currentNav.find(item => item.id === page)?.label || 'Workspace'
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">{collapsed ? <button type="button" className="brand-mark" title="Expand sidebar" aria-label="Expand sidebar" style={{appearance: 'none', border: 0, padding: 0, cursor: 'pointer'}} onClick={() => setCollapsed(false)}><GraduationCap size={21}/></button> : <><div className="brand-mark"><GraduationCap size={21}/></div><div className="brand-copy"><strong>IIIT Nagpur</strong><span style={{fontSize: '10px'}}>TRAINING & PLACEMENT</span></div><button type="button" className="sidebar-collapse" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={() => setCollapsed(true)}><PanelLeftClose size={17}/></button></>}</div>
      <div className="workspace-switch"><div className="workspace-monogram">{role === 'student' ? 'S' : role === 'admin' ? 'A' : 'SA'}</div>{!collapsed && <div className="workspace-info"><strong>{roleLabel} workspace</strong><span>Training & Placement</span></div>}</div>
      <nav className="side-nav">{[...new Set(currentNav.map(x => x.group))].map(group => <div key={group} className="nav-group"><div className="nav-group-label">{!collapsed && group}</div>{currentNav.filter(item => item.group === group).map(item => <button key={item.id} title={collapsed ? item.label : undefined} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => openPage(item.id)}><item.icon size={18}/>{!collapsed && <><span>{item.label}</span>{item.id === 'notifications' && <UnreadBadge api={api}/>}</>}</button>)}</div>)}</nav>
      {!collapsed && <div className="sidebar-bottom"><div className="sidebar-footer"><span className="online-dot"/> Placement portal operational</div></div>}
      <div className="sidebar-user"><Avatar name={profile.full_name || user?.email}/>{!collapsed && <div className="user-copy"><strong>{profile.full_name || user?.email?.split('@')[0]}</strong><span>{profile.bt_id || profile.email || user?.email}</span></div>}<button title="Sign out" aria-label="Sign out" className="signout-icon" onClick={() => logout('You have signed out.')}><LogOut size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{pageTitle}</strong></div></div><div className="topbar-right"><div className="topbar-date"><CalendarDays size={15}/>{niceDate(new Date().toISOString())}</div>{role === 'student' && <><button className="header-icon notification-trigger" aria-label="Notifications" onClick={() => openPage('notifications')}><Bell size={18}/><UnreadBadge api={api}/></button><div className="topbar-divider"/><button className="topbar-profile" onClick={() => openPage('profile')}><Avatar name={profile.full_name || user?.email}/><span><strong>{profile.full_name || 'Student'}</strong><small>{roleLabel}</small></span><ChevronDown size={14}/></button></>}{role !== 'student' && <div className="topbar-profile topbar-profile-static"><Avatar name={profile.full_name || user?.email}/><span><strong>{profile.full_name || user?.email}</strong><small>{roleLabel}</small></span></div>}</div></header>
      <div className="content-area" key={`${role}-${page}`}>
        <PageRenderer page={page} role={role} profile={profile} user={user} api={api} notify={notify} busy={busy} setBusy={setBusy} search={search} setSearch={setSearch} openPage={openPage} params={viewParams} refreshKey={refreshKey} setRefreshKey={setRefreshKey} logout={logout}/>
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} IIIT Nagpur · Training & Placement Cell</span><span><span className="online-dot"/> Secure placement workspace</span></footer>
    </main>
    <Toast toast={toast} onClose={() => setToast(null)}/>
  </div>
}
function decodeJwt(token) { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { return {} } }
function createNonce() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') }
function UnreadBadge({ api }) {
  const [count, setCount] = useState(0)
  useEffect(() => { let active = true; api('/api/students/notifications').then(({ data }) => { const rows = dataOf(data, 'notifications'); if (active) setCount(rows.filter(n => !n.is_read).length) }).catch(() => {}); return () => { active = false } }, [api])
  return count > 0 ? <span className="unread-badge">{count > 9 ? '9+' : count}</span> : null
}
function PageRenderer({ page, role, profile, user, api, notify, busy, setBusy, search, setSearch, openPage, params, refreshKey, setRefreshKey, logout }) {
  const common = { profile, user, api, notify, busy, setBusy, search, setSearch, openPage, params, refreshKey, setRefreshKey, logout }
  if (role === 'student') {
    if (page === 'overview') return <StudentDashboard {...common}/>
    if (page === 'opportunities') return <StudentOpportunities {...common}/>
    if (page === 'tracker') return <StudentTracker {...common}/>
    if (page === 'resumes') return <StudentFiles {...common}/>
    if (page === 'notifications') return <NotificationsPage {...common}/>
    if (page === 'profile') return <StudentProfile {...common}/>
  }
  if (role === 'admin') {
    if (page === 'overview') return <AdminDashboard {...common}/>
    if (page === 'drives') return <AdminDrives {...common}/>
    if (page === 'create-drive') return <CreateDrive {...common}/>
    if (page === 'applicants') return <AdminApplicants {...common}/>
    if (page === 'rounds') return <ManageRounds {...common}/>
    if (page === 'active-students') return <ActiveStudents {...common}/>
    if (page === 'analytics') return <AdminAnalytics {...common}/>
    if (page === 'logs') return <AdminLogs {...common}/>
  }
  if (role === 'superadmin') {
    if (page === 'overview') return <SuperadminDashboard {...common}/>
    if (page === 'students') return <SuperadminStudents {...common}/>
    if (page === 'admins') return <SuperadminAdmins {...common}/>
    if (page === 'drives') return <SuperadminDrives {...common}/>
    if (page === 'applications') return <SuperadminApplications {...common}/>
    if (page === 'audit-logs') return <AdminLogs {...common} superadmin/>
  }
  return <EmptyState title="Page not found" description="Choose a section from the navigation to continue."/>
}