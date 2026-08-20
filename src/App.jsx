import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WandSparkles,
  Brain,
  Binoculars,
  Folder,
  Heart,
  Clock,
  Settings,
  Bell,
  ChevronDown,
  ChevronUp,
  Download,
  PenLine,
  MoreHorizontal,
  Gem,
  SlidersHorizontal,
  Search,
  Plus,
  Car,
  Bike,
  Bot,
  Rocket,
  Watch,
  Building2,
  Sun,
  Moon,
  Copy,
  Link2,
  RefreshCw,
  Trash2,
  Expand,
  X,
  AlertTriangle,
  Check,
  Crown,
  ArrowLeft,
  LogOut,
  LogIn,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { supabase, authEnabled, getAccessToken } from './supabaseClient'

const ASPECTS = [
  { id: '1:1', w: 1, h: 1, label: '1:1' },
  { id: '4:3', w: 4, h: 3, label: '4:3' },
  { id: '3:4', w: 3, h: 4, label: '3:4' },
  { id: '16:9', w: 16, h: 9, label: '16:9' },
  { id: '9:16', w: 9, h: 16, label: '9:16' },
]
const RESOLUTIONS = [
  { id: 'Low', px: 512, label: 'Low' },
  { id: 'Medium', px: 768, label: 'Medium' },
  { id: 'High', px: 1024, label: 'High' },
]
const IMAGE_OPTIONS = [1, 2, 4]

const DEFAULT_SETTINGS = {
  name: 'Akshay Kumar',
  email: 'akshay@pixora.ai',
  autoplay: true,
  defAspect: 'square',
  defResolution: 'High',
  defCount: 1,
  notify: { generated: true, regenerated: true, deleted: true, favorite: true },
}
const NOTIFY_LABELS = {
  generated: 'New generations',
  regenerated: 'Regenerated images',
  deleted: 'Deleted images',
  favorite: 'Favorites',
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])

function isGibberish(text) {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter((w) => w.length > 0)
  if (!words.length) return false

  let totalLetters = 0
  let totalVowels = 0
  let anyBadWord = false
  for (const w of words) {
    totalLetters += w.length
    let vowels = 0
    let maxRun = 0
    let run = 0
    for (const ch of w) {
      if (VOWELS.has(ch)) {
        vowels++
        run = 0
      } else {
        run++
        if (run > maxRun) maxRun = run
      }
    }
    totalVowels += vowels
    if (w.length >= 8 && maxRun >= 5) anyBadWord = true
    if (w.length >= 4 && vowels === 0) anyBadWord = true
  }
  if (totalLetters < 6) return false
  if (anyBadWord) return true
  if (totalVowels / totalLetters < 0.2) return true
  return false
}

const SUGGESTIONS = [
  { icon: Car, text: 'midnight hypercar, cyberpunk boulevard, neon reflections' },
  { icon: Bike, text: 'neon superbike, rain-soaked highway, cyberpunk night' },
  { icon: Bot, text: 'humanoid android, chrome armor, futuristic laboratory' },
  { icon: Rocket, text: 'luxury starship, deep space, cinematic nebula glow' },
  { icon: Watch, text: 'futuristic skeleton watch, obsidian & rose gold, studio shine' },
  { icon: Building2, text: 'megacity 2099, neon towers, flying cars, rainy night' },
]

function Avatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials}
    </span>
  )
}

function Sidebar({ active, onNavigate, user, onOpenSettings, onUpgrade }) {
  const items = [
    { id: 'generate', label: 'Generate', icon: Brain },
    { id: 'explore', label: 'Explore', icon: Binoculars },
    { id: 'creations', label: 'Creations', icon: Folder },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'history', label: 'History', icon: Clock },
  ]

  return (
    <aside className="sidebar">
      <div className="side-logo">
        <img src="/Plogo.png" alt="Pixora" className="logo-img" />
        <span className="logo-word">Pixora</span>
      </div>

      <nav className="side-nav">
        <p className="nav-label">MENU</p>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-indicator" aria-hidden="true" />
              <Icon size={18} strokeWidth={1.8} />
              <span className="nav-text">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="side-bottom">
        <div className="profile-card">
        <Avatar name={user.name} />
          <div className="profile-meta">
            <span className="profile-name">{user.name}</span>
            <span className="profile-mail">{user.email}</span>
          </div>
          <button className="icon-btn icon-btn-sm" aria-label="Settings" onClick={onOpenSettings}>
            <Settings size={16} />
          </button>
        </div>
        <div className="plan-card">
          <div className="plan-head">
            <span className="plan-badge">PRO</span>
            <span className="plan-credits"><Gem size={12} /> 128</span>
          </div>
          <p className="plan-name">Credits remaining</p>
          <div className="plan-track">
            <span className="plan-fill" style={{ width: '64%' }} />
          </div>
          <div className="plan-meta">
            <span>128 of 200 used</span>
            <button className="plan-btn" onClick={onUpgrade}>Upgrade</button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function BottomNav({ active, onNavigate }) {
  const items = [
    { id: 'generate', label: 'Generate', icon: Brain },
    { id: 'explore', label: 'Explore', icon: Binoculars },
    { id: 'creations', label: 'Creations', icon: Folder },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'history', label: 'History', icon: Clock },
  ]

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-ico"><Icon size={19} strokeWidth={1.9} /></span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const TYPE_ICON = {
  generated: WandSparkles,
  regenerated: RefreshCw,
  deleted: Trash2,
  favorite: Heart,
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

function NotificationsPanel({ items, onClearAll, onDelete, onItemClick }) {
  const unread = items.filter((n) => !n.read).length
  return (
    <div className="notif-panel">
      <div className="notif-head">
        <span className="notif-title">Notifications</span>
        {unread > 0 && <span className="notif-unread-count">{unread} new</span>}
        {items.length > 0 && (
          <button className="notif-clear" onClick={onClearAll}>Clear all</button>
        )}
      </div>
      <div className="notif-list">
        {items.length === 0 ? (
          <div className="notif-empty">No notifications yet.</div>
        ) : (
          items.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell
            return (
              <div
                key={n.id}
                className={`notif-item${n.read ? '' : ' unread'}`}
              >
                <button className="notif-main" onClick={() => onItemClick(n)}>
                  {n.image && (
                    <span className="notif-thumb">
                      <img src={n.image.url} alt={n.image.prompt} loading="lazy" />
                    </span>
                  )}
                  <span className="notif-body">
                    <span className="notif-reason">
                      <span className={`notif-ico ${n.type}`}><Icon size={13} /></span>
                      {n.message}
                    </span>
                    {n.image && <span className="notif-prompt">{n.image.prompt}</span>}
                    <span className="notif-meta">
                      {n.image && <span className="chip">{n.image.width}×{n.image.height}</span>}
                      <span className="notif-time">{timeAgo(n.time)}</span>
                    </span>
                  </span>
                </button>
                <button
                  className="notif-delete"
                  title="Delete notification"
                  aria-label="Delete notification"
                  onClick={() => onDelete(n.id)}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function Topbar({ credits, onNew, theme, onToggleTheme, notifications, notifOpen, onToggleNotif, onClearAll, onDeleteNotif, onNotifItem, showHero, userName, videoAutoplay, onLogout, onLogin, onOpenSettings }) {
  const unread = notifications.filter((n) => !n.read).length
  const notifRef = useRef(null)
  const vidRef = useRef(null)
  const logoutRef = useRef(null)
  const [vidSeam, setVidSeam] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) onToggleNotif(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen, onToggleNotif])

  useEffect(() => {
    if (!logoutOpen) return
    function handleClick(e) {
      if (logoutRef.current && !logoutRef.current.contains(e.target)) setLogoutOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [logoutOpen])

  function handleVideoTime() {
    const v = vidRef.current
    if (!v) return
    if (v.currentTime > v.duration - 0.35) setVidSeam(true)
    else if (v.currentTime < 0.1) setVidSeam(false)
  }

  return (
    <header className="topbar">
      <div className="top-actions">
        <button className="credits-chip" aria-label="Credits">
          <Gem size={15} fill="currentColor" />
          <span>{credits}</span>
          <span className="credits-label">credits</span>
        </button>
        <button className="icon-btn theme-btn" onClick={onToggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {onOpenSettings && (
          <button className="icon-btn settings-btn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
            <Settings size={18} />
          </button>
        )}
        <div className="notif-wrap" ref={notifRef}>
          <button
            className={`icon-btn${notifOpen ? ' active' : ''}`}
            aria-label="Notifications"
            onClick={() => onToggleNotif(!notifOpen)}
          >
            <Bell size={18} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
          {notifOpen && (
            <NotificationsPanel
              items={notifications}
              onClearAll={onClearAll}
              onDelete={onDeleteNotif}
              onItemClick={onNotifItem}
            />
          )}
        </div>
        <button className="new-btn" onClick={onNew}>
          <Plus size={16} /> New
        </button>
        {onLogin ? (
          <button className="login-btn" onClick={onLogin}>
            <LogIn size={16} /> Login
          </button>
        ) : (
          <>
            <Avatar name={userName} />
            {onLogout && (
              <div className="logout-wrap" ref={logoutRef}>
                <button
                  className={`icon-btn logout-btn${logoutOpen ? ' active' : ''}`}
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={() => setLogoutOpen((v) => !v)}
                >
                  <LogOut size={17} />
                </button>
                {logoutOpen && (
                  <div className="logout-pop">
                    <p className="logout-pop-title">Log out?</p>
                    <p className="logout-pop-text">You'll need to sign in again to generate, save, and sync your images.</p>
                    <div className="logout-pop-actions">
                      <button className="ghost-btn" onClick={() => setLogoutOpen(false)}>Cancel</button>
                      <button className="btn-danger" onClick={() => { setLogoutOpen(false); onLogout() }}>
                        <LogOut size={15} /> Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showHero && (
        <div className="hero-greeting">
          <h2>Hello, {userName.trim().split(' ')[0] || 'there'}</h2>
          <p>What are you creating today?</p>
        </div>
      )}

      {showHero && (
        <div className="hero">
          <div className="hero-content">
            <span className="top-eyebrow">
              <span className="eyebrow-dot" /> AI IMAGE GENERATOR
            </span>
            <h1>Create something extraordinary.</h1>
            <p>Type a prompt, pick a style, and Pixora renders a gallery-ready image.</p>
          </div>
          <div className="hero-media">
            <video
              ref={vidRef}
              className={vidSeam ? 'seaming' : ''}
              src="/video/vid.mp4"
              autoPlay={videoAutoplay}
              muted
              loop
              playsInline
              onTimeUpdate={handleVideoTime}
            />
          </div>
          <span className="hero-badge">
            <span className="hero-pulse" />
            AI Live
          </span>
        </div>
      )}
    </header>
  )
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented">
        {options.map((opt) => (
          <button
            key={opt.id ?? opt}
            className={`seg-btn${String(value) === String(opt.id ?? opt) ? ' active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt.label ?? opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function PrintCard({ entry, index, isFavorite, onToggleFavorite, onEdit, onDelete, onAction, onView }) {
  const time = new Date(entry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const delay = Math.min(index * 70, 420)
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!moreOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreOpen])

  function closeMenu() {
    setMoreOpen(false)
  }

  async function runMenuAction(action) {
    if (busy) return
    setBusy(action)
    try {
      await onAction(action, entry)
    } finally {
      setBusy('')
      closeMenu()
    }
  }

  const isBusy = busy !== ''

  return (
    <article className="result-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="result-thumb">
        <button className="thumb-open" onClick={() => onView(entry)} title="View full size" aria-label="View full size">
          <img src={entry.url} alt={entry.prompt} loading="lazy" />
          <span className="thumb-zoom"><Expand size={18} /></span>
        </button>
        <div className="result-actions">
          <a className="act-btn" href={entry.url} download={`pixora-${entry.id}.jpg`} title="Download">
            <Download size={16} />
          </a>
          <button className="act-btn" title="Edit" onClick={() => onEdit(entry.prompt)}>
            <PenLine size={16} />
          </button>
          <button
            className={`act-btn${isFavorite ? ' fav-on' : ''}`}
            title={isFavorite ? 'Remove favorite' : 'Favorite'}
            onClick={() => onToggleFavorite(entry)}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button className="act-btn act-danger" title="Delete" onClick={() => onDelete(entry)}>
            <Trash2 size={16} />
          </button>
          <div className="more-wrap" ref={menuRef}>
            <button className={`act-btn${moreOpen ? ' active' : ''}`} title="More" onClick={() => setMoreOpen((v) => !v)}>
              <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <div className="more-menu">
                <button onClick={() => runMenuAction('copy-prompt')} disabled={isBusy}>
                  <Copy size={14} /> Copy prompt
                </button>
                <button onClick={() => runMenuAction('copy-url')} disabled={isBusy}>
                  <Link2 size={14} /> Copy URL
                </button>
                <button onClick={() => runMenuAction('regenerate')} disabled={isBusy}>
                  {busy === 'regenerate' ? <span className="mini-spin" /> : <RefreshCw size={14} />} Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="result-body">
        <p className="result-prompt">{entry.prompt}</p>
        <div className="result-meta">
          <span className="chip">{entry.width}×{entry.height}</span>
          <span className="chip">Pixora 2.0</span>
          <span className="result-time">{time}</span>
        </div>
      </div>
    </article>
  )
}

function PendingCard({ entry }) {
  return (
    <article className="result-card pending-card">
      <div className="result-thumb pending-thumb">
        <span className="pending-label">
          <span className="mini-spin" /> Rendering…
        </span>
      </div>
      <div className="result-body">
        <div className="skel-line w90" />
        <div className="skel-line w60" />
      </div>
    </article>
  )
}

function SectionHead({ title, count, searchOpen, searchQuery, onSearchToggle, onSearchChange, onSearchClose }) {
  return (
    <div className="section-head">
      <h2>{title} — {imagesLabel(count)}</h2>
      {searchOpen ? (
        <div className="search-bar">
          <Search size={14} className="search-bar-icon" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by prompt…"
            aria-label="Search gallery"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => onSearchChange('')} title="Clear search">
              <X size={13} />
            </button>
          )}
          <button className="ghost-btn search-close" onClick={onSearchClose}>Close</button>
        </div>
      ) : (
        <button className="ghost-btn" onClick={onSearchToggle}>
          <Search size={14} /> Search gallery
        </button>
      )}
    </div>
  )
}

function EmptyVisual() {
  const IMGS = [
    '/Images/empty-set/emp1.jpg',
    '/Images/empty-set/emp2.jpg',
    '/Images/empty-set/emp3.jpg',
    '/Images/empty-set/emp4.jpg',
    '/Images/empty-set/emp5.jpg',
  ]

  const POS = [
    { left: '2%', top: 16, rot: -14, z: 1 },
    { left: '18%', top: 8, rot: -7, z: 2 },
    { left: '35%', top: 0, rot: 0, z: 5 },
    { left: '52%', top: 8, rot: 7, z: 2 },
    { left: '69%', top: 16, rot: 14, z: 1 },
  ]

  return (
    <div className="empty-visual" aria-hidden="true">
      {IMGS.map((src, i) => (
        <div
          key={src}
          className={`ev-card${i === 2 ? ' ev-front' : ''}`}
          style={{
            left: POS[i].left,
            top: POS[i].top,
            zIndex: POS[i].z,
            '--rot': `${POS[i].rot}deg`,
            transitionDelay: `${Math.abs(i - 2) * 0.06}s`,
          }}
        >
          <img src={src} alt="" />
        </div>
      ))}
    </div>
  )
}

function GalleryGrid({ entries, favorites, onToggleFavorite, onEdit, onDelete, onView, onAction, emptyTitle, emptySub, withVisual = true }) {
  const [showMore, setShowMore] = useState(false)
  useEffect(() => setShowMore(false), [entries])

  if (entries.length === 0) {
    return (
      <div className="empty">
        {withVisual && <EmptyVisual />}
        <p className="empty-title">{emptyTitle}</p>
        <p className="empty-sub">{emptySub}</p>
      </div>
    )
  }

  const visible = showMore ? entries : entries.slice(0, 16)
  return (
    <>
      <div className="grid">
        {visible.map((entry, i) =>
          entry._pending ? (
            <PendingCard key={entry.id} entry={entry} />
          ) : (
            <PrintCard
              key={entry.id}
              entry={entry}
              index={i}
              isFavorite={favorites.has(entry.id)}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onAction={onAction}
            />
          )
        )}
      </div>
      {entries.length > 16 && (
        <div className="view-more-wrap">
          <button className="view-more-btn" onClick={() => setShowMore((v) => !v)}>
            {showMore ? (
              <>
                <ChevronUp size={16} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={16} /> View more images
              </>
            )}
          </button>
        </div>
      )}
    </>
  )
}

function HistoryRow({ entry, isFavorite, onToggleFavorite, onView, onDelete }) {
  const date = new Date(entry.createdAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="history-row">
      <button className="history-thumb" onClick={() => onView(entry)} title="View image">
        <img src={entry.url} alt={entry.prompt} loading="lazy" />
      </button>
      <div className="history-info">
        <p className="history-prompt">{entry.prompt}</p>
        <div className="history-meta">
          <span className="chip">{entry.width}×{entry.height}</span>
          <span className="chip">Pixora 2.0</span>
        </div>
      </div>
      <span className="history-time">{date}</span>
      <div className="history-actions">
        <button className="history-btn" title="View" onClick={() => onView(entry)}>
          <Expand size={15} />
        </button>
        <button
          className={`history-btn${isFavorite ? ' fav-on' : ''}`}
          title={isFavorite ? 'Remove favorite' : 'Favorite'}
          onClick={() => onToggleFavorite(entry)}
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button className="history-btn danger" title="Delete" onClick={() => onDelete(entry)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function SettingsModal({ settings, onChange, onClose, onDone, theme, onToggleTheme, onApplyDefaults, onClearHistory, onClearFavs, onClearNotifs, historyCount, favCount, notifCount }) {
  const [confirm, setConfirm] = useState('')

  function patch(partial) {
    onChange({ ...settings, ...partial })
  }

  function patchNotify(key, val) {
    onChange({ ...settings, notify: { ...settings.notify, [key]: val } })
  }

  function danger(key, fn) {
    if (confirm !== key) {
      setConfirm(key)
      setTimeout(() => setConfirm((c) => (c === key ? '' : c)), 3000)
      return
    }
    setConfirm('')
    fn()
  }

  return (
    <div className="modal-overlay settings-overlay" onClick={onClose}>
      <div className="modal-panel settings-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-head">
          <div>
            <h3 className="modal-title">Settings</h3>
            <p className="settings-sub">Personalize your Pixora workspace.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h4 className="settings-section-title">Profile</h4>
            <div className="settings-grid">
              <label className="setting-field">
                <span>Display name</span>
                <input
                  value={settings.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label className="setting-field">
                <span>Email</span>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="you@pixora.ai"
                  readOnly={authEnabled}
                  title={authEnabled ? 'Email is tied to your account' : undefined}
                />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title">Appearance</h4>
            <div className="settings-row">
              <div className="settings-row-text">
                <span>Light theme</span>
                <small>Switch between dark and light mode</small>
              </div>
              <button className={`toggle${theme === 'light' ? ' on' : ''}`} onClick={onToggleTheme} aria-pressed={theme === 'light'}>
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <span>Video preview autoplay</span>
                <small>Auto-play the hero video on the home page</small>
              </div>
              <button className={`toggle${settings.autoplay ? ' on' : ''}`} onClick={() => patch({ autoplay: !settings.autoplay })} aria-pressed={settings.autoplay}>
                <span className="toggle-knob" />
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title">Generation defaults</h4>
            <p className="settings-hint">Presets for the generate panel — applied instantly.</p>
            <div className="settings-grid three">
              <label className="setting-field">
                <span>Aspect ratio</span>
                <select
                  value={settings.defAspect}
                  onChange={(e) => {
                    const opt = ASPECTS.find((x) => x.id === e.target.value)
                    patch({ defAspect: e.target.value })
                    if (opt) onApplyDefaults({ aspect: opt })
                  }}
                >
                  {ASPECTS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </label>
              <label className="setting-field">
                <span>Resolution</span>
                <select
                  value={settings.defResolution}
                  onChange={(e) => {
                    const opt = RESOLUTIONS.find((x) => x.id === e.target.value)
                    patch({ defResolution: e.target.value })
                    if (opt) onApplyDefaults({ resolution: opt })
                  }}
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label className="setting-field">
                <span>Images</span>
                <select
                  value={settings.defCount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    patch({ defCount: n })
                    onApplyDefaults({ count: n })
                  }}
                >
                  {IMAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title">Notifications</h4>
            <p className="settings-hint">Choose which events appear in the notification bell.</p>
            {Object.keys(NOTIFY_LABELS).map((key) => (
              <div className="settings-row" key={key}>
                <div className="settings-row-text">
                  <span>{NOTIFY_LABELS[key]}</span>
                </div>
                <button
                  className={`toggle${settings.notify[key] ? ' on' : ''}`}
                  onClick={() => patchNotify(key, !settings.notify[key])}
                  aria-pressed={settings.notify[key]}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            ))}
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title danger-title">Data</h4>
            <div className="settings-data-list">
              <div className="settings-row">
                <div className="settings-row-text">
                  <span>Clear history</span>
                  <small>{historyCount} saved generations</small>
                </div>
                <button
                  className={`data-btn${confirm === 'history' ? ' confirm' : ''}`}
                  onClick={() => danger('history', onClearHistory)}
                >
                  {confirm === 'history' ? 'Confirm?' : 'Clear'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text">
                  <span>Clear favorites</span>
                  <small>{favCount} favorited images</small>
                </div>
                <button
                  className={`data-btn${confirm === 'favs' ? ' confirm' : ''}`}
                  onClick={() => danger('favs', onClearFavs)}
                >
                  {confirm === 'favs' ? 'Confirm?' : 'Clear'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text">
                  <span>Clear notifications</span>
                  <small>{notifCount} recent alerts</small>
                </div>
                <button
                  className={`data-btn${confirm === 'notifs' ? ' confirm' : ''}`}
                  onClick={() => danger('notifs', onClearNotifs)}
                >
                  {confirm === 'notifs' ? 'Confirm?' : 'Clear'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-foot">
          <button className="ghost-btn" onClick={() => { onClose(); onDone() }}>Done</button>
        </div>
      </div>
    </div>
  )
}

function PricingModal({ onClose, onSelect }) {
  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$12',
      per: 'per month',
      credits: '200 credits / month',
      features: ['4K generation', 'Priority queue', 'No watermarks', 'Private renders', 'Email support'],
      featured: false,
    },
    {
      id: 'studio',
      name: 'Studio',
      price: '$29',
      per: 'per month',
      credits: '100 credits / month',
      features: ['Everything in Pro', 'Team workspace', 'API access', 'Custom styles', 'Dedicated support'],
      featured: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$59',
      per: 'per month',
      credits: 'Unlimited everything',
      features: ['Everything in Studio', 'Custom model training', 'Private API gateway', 'SLA & uptime guarantee', 'Dedicated success manager'],
      featured: false,
    },
  ]

  return (
    <div className="modal-overlay pricing-overlay" onClick={onClose}>
      <div className="modal-panel pricing-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pricing plans">
        <div className="pricing-head">
          <div>
            <h3 className="modal-title">Upgrade your plan</h3>
            <p className="settings-sub">Pick the tier that fits how you create.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close pricing"><X size={18} /></button>
        </div>

        <div className="pricing-grid">
          {plans.map((p) => (
            <div className={`pricing-card${p.featured ? ' featured' : ''}`} key={p.id}>
              {p.featured && <span className="pricing-pop"><Crown size={11} /> CURRENTLY BEST</span>}
              <span className="pricing-name">{p.name}</span>
              <div className="pricing-price">
                <strong>{p.price}</strong>
                <span>{p.per}</span>
              </div>
              <p className="pricing-credits">{p.credits}</p>
              <ul className="pricing-features">
                {p.features.map((f) => (
                  <li key={f}><Check size={13} strokeWidth={2.4} /> {f}</li>
                ))}
              </ul>
              <button className="pricing-cta" onClick={() => onSelect(p.name)}>
                Select plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotFoundPage({ onBack }) {
  return (
    <div className="notfound">
      <span className="nf-404bg" aria-hidden="true">404</span>
      <span className="nf-beam" aria-hidden="true" />
      <span className="nf-spark k1" aria-hidden="true" />
      <span className="nf-spark k2" aria-hidden="true" />
      <span className="nf-spark k3" aria-hidden="true" />

      <div className="nf-inner">
        <span className="nf-eyebrow">ERROR 404</span>
        <h1 className="nf-glitch">Page not found</h1>
        <p>
          The page you&apos;re looking for doesn&apos;t exist, may have been moved, or is temporarily unavailable. Please check the address and try again.
        </p>
        <div className="nf-actions">
          <button className="btn-primary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to home
          </button>
          <button className="ghost-btn" onClick={onBack}>Try again</button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true">
      <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function goToStep2(event) {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError('Please enter your name.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setStep(2)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (mode === 'signin' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    const startedAt = Date.now()
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (signUpError) throw signUpError
        if (data.session) {
          const token = await getAccessToken()
          if (token) {
            try {
              await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim() }),
              })
            } catch {}
          }
        } else {
          setMode('signin')
          setStep(1)
          setEmail('')
          setPassword('')
          setError('Account created! Check your inbox for a confirmation link, then sign in.')
          setBusy(false)
          return
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }

      const remaining = Math.max(0, 3000 - (Date.now() - startedAt))
      setTimeout(() => {
        setBusy(false)
        setSuccess(true)
        setTimeout(() => onClose(), 1300)
      }, remaining)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="auth-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-card">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="auth-modal-visual">
          <img src="/Images/logback.jpg" alt="" className="auth-modal-img" />
          <div className="auth-modal-brand">
            <img src="/Plogo.png" alt="Pixora" className="logo-img" />
            <span className="logo-word">Pixora</span>
          </div>
          <div className="auth-modal-copy">
            <h3>Turn ideas into stunning visuals.</h3>
            <p>Join thousands of creators building with AI.</p>
          </div>
        </div>

        <div className="auth-modal-form">
          <div className="auth-modal-head">
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p>
              {mode === 'signin'
                ? 'Sign in to generate, save, and share your AI art.'
                : 'Join Pixora and start creating gallery-ready images.'}
            </p>
          </div>

          <div className={`auth-modal-tabs${mode === 'signup' ? ' active-second' : ''}`}>
            <button
              className={`auth-modal-tab${mode === 'signin' ? ' active' : ''}`}
              onClick={() => { setMode('signin'); setStep(1); setError('') }}
            >
              Sign in
            </button>
            <button
              className={`auth-modal-tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => { setMode('signup'); setStep(1); setError('') }}
            >
              Create account
            </button>
          </div>

          {mode === 'signup' && (
            <div className="auth-modal-steps">
              <span className="auth-modal-step-label">Step {step} of 2</span>
              <span className={`step-dot${step === 1 ? ' active' : ''}`} />
              <span className={`step-dot${step === 2 ? ' active' : ''}`} />
            </div>
          )}

          <div className="auth-modal-social">
            <button type="button" className="auth-modal-social-btn">
              <GoogleIcon /> Google
            </button>
            <button type="button" className="auth-modal-social-btn">
              <AppleIcon /> Apple
            </button>
          </div>
          <div className="auth-modal-or"><span>or continue with email</span></div>

          <form className="auth-modal-body" onSubmit={mode === 'signup' && step === 1 ? goToStep2 : submit}>
            {mode === 'signup' && step === 1 && (
              <>
                <label className="auth-modal-field">
                  <span className="auth-modal-label">Username</span>
                  <div className="auth-modal-input-wrap">
                    <User size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </label>

                <label className="auth-modal-field">
                  <span className="auth-modal-label">Email</span>
                  <div className="auth-modal-input-wrap">
                    <Mail size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </label>
              </>
            )}

            {mode === 'signup' && step === 2 && (
              <>
                <label className="auth-modal-field">
                  <span className="auth-modal-label">Password</span>
                  <div className="auth-modal-input-wrap">
                    <Lock size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-modal-eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="auth-modal-field">
                  <span className="auth-modal-label">Confirm password</span>
                  <div className="auth-modal-input-wrap">
                    <Lock size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      type={showPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </div>
                </label>
              </>
            )}

            {mode === 'signin' && (
              <>
                <label className="auth-modal-field">
                  <span className="auth-modal-label">Email</span>
                  <div className="auth-modal-input-wrap">
                    <Mail size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <label className="auth-modal-field">
                  <span className="auth-modal-label">Password</span>
                  <div className="auth-modal-input-wrap">
                    <Lock size={16} className="auth-modal-input-icon" />
                    <input
                      className="auth-modal-input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-modal-eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </>
            )}

            {error && <p className="auth-modal-error" role="alert">{error}</p>}

            {mode === 'signup' && step === 2 && (
              <button type="button" className="auth-modal-back" onClick={() => { setStep(1); setError('') }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <button
              className={`auth-modal-cta${busy ? ' busy' : ''}`}
              type="submit"
              disabled={busy || success}
            >
              {busy ? (
                <span className="auth-modal-spin" />
              ) : mode === 'signup' && step === 1 ? (
                'Continue'
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create account'
              )}
            </button>
          </form>
        </div>

        {success && (
          <div className="auth-modal-success">
            <div className="auth-modal-success-badge">
              <svg viewBox="0 0 24 24" className="auth-modal-check-svg" aria-hidden="true">
                <path d="M4.5 12.5l5 5 10-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="auth-modal-success-text">Welcome to Pixora!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pixora-theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [activeNav, setActiveNav] = useState('generate')
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('pixora-settings') || '{}') }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [notFound, setNotFound] = useState(null)
  const [prints, setPrints] = useState([])
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(0)

  const [aspect, setAspect] = useState(() => ASPECTS.find((a) => a.id === settings.defAspect) || ASPECTS[0])
  const [resolution, setResolution] = useState(() => RESOLUTIONS.find((r) => r.id === settings.defResolution) || RESOLUTIONS[1])
  const [imageCount, setImageCount] = useState(() => IMAGE_OPTIONS.includes(settings.defCount) ? settings.defCount : IMAGE_OPTIONS[0])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loadedHistory = useRef(false)
  const galleryRef = useRef(null)
  const promptCardRef = useRef(null)
  const promptRef = useRef(null)
  const toastTimer = useRef(null)
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [warnPrompt, setWarnPrompt] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState(new Set())
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pixora-notifs') || '[]')
    } catch {
      return []
    }
  })
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('pixora-notifs', JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    localStorage.setItem('pixora-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!authEnabled) {
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!deleteTarget) return
    function onKey(e) {
      if (e.key === 'Escape') setDeleteTarget(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [deleteTarget])

  useEffect(() => {
    if (!viewer) return
    function onKey(e) {
      if (e.key === 'Escape') setViewer(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [viewer])

  useEffect(() => {
    if (!warnPrompt) return
    function onKey(e) {
      if (e.key === 'Escape') setWarnPrompt(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [warnPrompt])

  useEffect(() => {
    if (!settingsOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [settingsOpen])

  useEffect(() => {
    if (!pricingOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setPricingOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [pricingOpen])

  useEffect(() => {
    if (!notFound) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [notFound])

  async function handleClearHistory() {
    try {
      const res = await fetch('/api/clear', {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({ target: 'history' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not clear history')
      }
    } catch (err) {
      notify(err.message || 'Could not clear history')
      return
    }
    setPrints((prev) => prev.filter((p) => p._pending))
    setFavorites(new Set())
    notify('History cleared')
  }

  async function handleClearFavs() {
    try {
      const res = await fetch('/api/clear', {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({ target: 'favorites' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not clear favorites')
      }
    } catch (err) {
      notify(err.message || 'Could not clear favorites')
      return
    }
    setFavorites(new Set())
    notify('Favorites cleared')
  }

  function handleSelectPlan(name) {
    setPricingOpen(false)
    setNotFound(name)
  }

  function notify(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  async function copyText(text, confirm) {
    try {
      await navigator.clipboard.writeText(text)
      notify(confirm)
    } catch {
      notify('Could not copy')
    }
  }

  async function toggleFavorite(entry) {
    const nextVal = !favorites.has(entry.id)
    try {
      const res = await fetch('/api/favorite', {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({ id: entry.id, favorite: nextVal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update favorite')
      setFavorites((prev) => {
        const next = new Set(prev)
        if (nextVal) next.add(entry.id)
        else next.delete(entry.id)
        return next
      })
      if (nextVal) {
        pushNotification('favorite', 'Added to favorites', {
          url: entry.url,
          prompt: entry.prompt,
          width: entry.width,
          height: entry.height,
        })
      }
    } catch (err) {
      notify(err.message || 'Could not update favorite')
    }
  }

  function pushNotification(type, message, image = null) {
    if (!settings.notify[type]) return
    const n = { id: `n-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, type, message, image, time: new Date().toISOString(), read: false }
    setNotifications((prev) => [n, ...prev].slice(0, 30))
  }

  function handleNotifToggle(open) {
    setNotifOpen(open)
    if (open) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  function handleClearNotifs() {
    setNotifications([])
  }

  function handleDeleteNotif(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  function handleNotifItem() {
    setNotifOpen(false)
  }

  function editPrompt(text) {
    setPrompt(text)
    promptCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => promptRef.current?.focus(), 380)
    notify('Prompt loaded for editing')
  }

  function handleNew() {
    setActiveNav('generate')
    setSearchOpen(false)
    setSearchQuery('')
    setShowAdvanced(false)
    setPrompt('')
    setTimeout(() => {
      promptCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => promptRef.current?.focus(), 400)
    }, 60)
    notify('New image — ready when you are')
  }

  function fitRect(width, height, max = 1024) {
    const longSide = Math.max(width, height)
    if (longSide <= max) return { width, height }
    const scale = max / longSide
    return {
      width: Math.max(256, Math.round(width * scale)),
      height: Math.max(256, Math.round(height * scale)),
    }
  }

  async function generateExtra(promptText, width, height) {
    const id = `pending-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    setPrints((prev) => [{ _pending: true, id, prompt: promptText, width, height }, ...prev])
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({ prompt: promptText, width, height }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error && data.error.includes('sign in')) {
          setSession(null)
        }
        throw new Error(data.error || 'Something went wrong.')
      }
      setPrints((prev) => prev.map((p) => (p.id === id ? data : p)))
      return data
    } catch (err) {
      setPrints((prev) => prev.filter((p) => p.id !== id))
      throw err
    }
  }

  async function handleAction(action, entry) {
    if (action === 'copy-prompt') {
      return copyText(entry.prompt, 'Prompt copied')
    } else if (action === 'copy-url') {
      const absolute = entry.url.startsWith('http') ? entry.url : `${window.location.origin}${entry.url}`
      return copyText(absolute, 'Image URL copied')
    } else if (action === 'regenerate') {
      try {
        const target = fitRect(entry.width, entry.height)
        await generateExtra(entry.prompt, target.width, target.height)
        notify('Image regenerated')
        pushNotification('regenerated', 'Image regenerated', {
          url: entry.url,
          prompt: entry.prompt,
          width: entry.width,
          height: entry.height,
        })
      } catch (err) {
        notify(err.message || 'Regeneration failed')
      }
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setPrints((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setFavorites((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
      notify('Image deleted')
      pushNotification('deleted', 'Image deleted', {
        url: deleteTarget.url,
        prompt: deleteTarget.prompt,
        width: deleteTarget.width,
        height: deleteTarget.height,
      })
    } catch (err) {
      notify(err.message || 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pixora-theme', theme)
  }, [theme])

  async function apiHeaders() {
    const token = authEnabled ? await getAccessToken() : null
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/history', { headers: await apiHeaders() })
      if (res.status === 401) {
        await supabase.auth.signOut()
        setSession(null)
        return
      }
      const history = await res.json()
      if (Array.isArray(history)) {
        setPrints(history)
        setFavorites(new Set(history.filter((e) => e.favorite).map((e) => e.id)))
      }
    } catch (err) {
      console.error("Couldn't load history:", err)
    }
  }

  useEffect(() => {
    if (authEnabled && !session) return
    if (loadedHistory.current) return
    loadedHistory.current = true
    loadHistory()
  }, [session])

  useEffect(() => {
    if (!authEnabled || !session) return
    getAccessToken().then(async (token) => {
      if (!token) return
      try {
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) {
          await supabase.auth.signOut()
          setSession(null)
          return
        }
        const data = await res.json()
        if (data.name) {
          setSettings((prev) => ({ ...prev, name: data.name, email: session.user.email }))
        }
      } catch (err) {
        console.error("Couldn't load profile:", err)
      }
    })
  }, [session])

  const dimensions = useMemo(() => {
    const base = resolution.px
    const scale = base / Math.max(aspect.w, aspect.h)
    return {
      width: Math.round(aspect.w * scale),
      height: Math.round(aspect.h * scale),
    }
  }, [aspect, resolution])

  async function handleGenerate(event) {
    event.preventDefault()
    setError('')

    const trimmed = prompt.trim()
    if (!trimmed) {
      setError('Describe the image you want to create first.')
      return
    }

    if (isGibberish(trimmed)) {
      setWarnPrompt(true)
      return
    }

    if (authEnabled && !session) {
      setAuthOpen(true)
      setError('Please sign in to generate images.')
      return
    }

    const finalPrompt = trimmed

    setIsGenerating(true)
    setGenerated(0)
    try {
      const created = []
      for (let i = 0; i < imageCount; i++) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: await apiHeaders(),
          body: JSON.stringify({
            prompt: finalPrompt,
            width: dimensions.width,
            height: dimensions.height,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (created.length === 0) setError(data.error || 'Something went wrong.')
          break
        }
        created.push(data)
        setGenerated(i + 1)
      }
      if (created.length) {
        setPrints((prev) => [...created, ...prev])
        galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const first = created[0]
        pushNotification(
          'generated',
          created.length > 1 ? `${created.length} new images generated` : 'Your image is ready',
          { url: first.url, prompt: first.prompt, width: first.width, height: first.height }
        )
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  function applySuggestion(text) {
    setPrompt(text)
  }

  function filterSearch(list) {
    if (!searchTerm) return list
    return list.filter((p) => !p._pending && p.prompt.toLowerCase().includes(searchTerm))
  }

  const searchTerm = searchQuery.trim().toLowerCase()
  const visiblePrints = filterSearch(prints)
  const creations = filterSearch(prints.filter((p) => !p._pending))
  const favs = filterSearch(prints.filter((p) => !p._pending && favorites.has(p.id)))
  const historyEntries = prints.filter((p) => !p._pending)
  const filteredHistory = filterSearch(historyEntries)

  const recent = prints.filter((p) => !p._pending).slice(0, 8)

  const displayUser = {
    name: authEnabled && session ? settings.name || 'Guest' : 'Guest',
    email: authEnabled && session ? settings.email || 'Guest@pixora.com' : 'Guest@pixora.com',
  }

  function handleNavigate(id) {
    setActiveNav(id)
    setSearchOpen(false)
    setSearchQuery('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    window.location.reload()
  }

  if (authEnabled && !authReady) {
    return (
      <div className="auth-screen">
        <span className="spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar active={activeNav} onNavigate={handleNavigate} user={displayUser} onOpenSettings={() => setSettingsOpen(true)} onUpgrade={() => setPricingOpen(true)} />

      <main className="main">
        <div className="main-body">
          <Topbar
            credits={120}
            onNew={handleNew}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            notifications={notifications}
            notifOpen={notifOpen}
            onToggleNotif={handleNotifToggle}
            onClearAll={handleClearNotifs}
            onDeleteNotif={handleDeleteNotif}
            onNotifItem={handleNotifItem}
            showHero={activeNav === 'generate'}
            userName={displayUser.name}
            videoAutoplay={settings.autoplay}
            onLogout={authEnabled && session ? handleLogout : undefined}
            onLogin={authEnabled && !session ? () => setAuthOpen(true) : undefined}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {activeNav === 'generate' && (
            <>
              <section className="panel generate-panel" ref={promptCardRef}>
                <form onSubmit={handleGenerate}>
                  <div className="prompt-row">
                    <textarea
                      id="prompt"
                      ref={promptRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      maxLength={1000}
                      rows={3}
                      required
                    />
                    <span className="char-count">{prompt.length}/1000</span>
                    <button className="prompt-send" type="submit" disabled={isGenerating}>
                      {isGenerating ? <span className="spinner" /> : <><Brain size={16} strokeWidth={1.8} /> Generate</>}
                    </button>
                  </div>

                  <div className="suggestions">
                    <span className="sugg-label">TRY</span>
                    <div className="sugg-grid">
                      {SUGGESTIONS.map((s) => {
                        const SuggIcon = s.icon
                        return (
                          <button type="button" key={s.text} className="sugg-chip" onClick={() => applySuggestion(s.text)}>
                            <span className="sugg-icon"><SuggIcon size={15} strokeWidth={1.8} /></span>
                            <span className="sugg-text">{s.text}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="prompt-footer">
                    <button
                      type="button"
                      className={`adv-toggle${showAdvanced ? ' open' : ''}`}
                      onClick={() => setShowAdvanced((v) => !v)}
                    >
                      <SlidersHorizontal size={15} />
                      Advanced
                      <ChevronDown size={14} className="adv-chev" />
                    </button>
                    <div className="footer-right">
                      {error && <p className="error" role="alert" aria-live="polite">{error}</p>}
                    </div>
                  </div>
                </form>

                <div className={`adv-panel${showAdvanced ? ' open' : ''}`}>
                  <div className="adv-grid">
                    <Segmented label="Aspect ratio" value={aspect.id} options={ASPECTS} onChange={setAspect} />
                    <Segmented label="Resolution" value={resolution.id} options={RESOLUTIONS} onChange={setResolution} />
                    <Segmented
                      label="Images"
                      value={imageCount}
                      options={IMAGE_OPTIONS.map((n) => ({ id: n, label: n }))}
                      onChange={(o) => setImageCount(o.id ?? o)}
                    />
                  </div>
                </div>
              </section>

              <section className="results" ref={galleryRef}>
                <SectionHead
                  title="Result"
                  count={visiblePrints.length}
                  searchOpen={searchOpen}
                  searchQuery={searchQuery}
                  onSearchToggle={() => setSearchOpen(true)}
                  onSearchChange={setSearchQuery}
                  onSearchClose={() => {
                    setSearchOpen(false)
                    setSearchQuery('')
                  }}
                />

                {isGenerating && (
                  <div className="grid loading-grid">
                    {Array.from({ length: imageCount }).map((_, i) => (
                      <div className="skel" key={i}>
                        <div className="skel-img" />
                        <div className="skel-line w70" />
                        <div className="skel-line w40" />
                      </div>
                    ))}
                  </div>
                )}

                {!isGenerating && (
                  <GalleryGrid
                    entries={visiblePrints}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onEdit={editPrompt}
                    onDelete={setDeleteTarget}
                    onView={setViewer}
                    onAction={handleAction}
                    emptyTitle={searchTerm ? 'No matches found' : 'Your gallery is empty'}
                    emptySub={
                      searchTerm
                        ? `No image prompt contains “${searchQuery.trim()}”.`
                        : 'Write a prompt above and generate your first image.'
                    }
                    withVisual={!searchTerm}
                  />
                )}
              </section>

              {recent.length > 0 && (
                <section className="recent">
                  <div className="section-head">
                    <h2>Recent generations</h2>
                    <span className="section-count">{recent.length}</span>
                  </div>
                  <div className="recent-strip">
                    {recent.map((entry) => (
                      <div className="recent-thumb" key={entry.id} title={entry.prompt}>
                        <img src={entry.url} alt={entry.prompt} loading="lazy" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {activeNav === 'explore' && (
            <section className="results">
              <div className="explore-hero">
                <span className="explore-kicker">EXPLORE</span>
                <h2>Discover AI art, fresh from the studio.</h2>
                <p>Browse your newest renders and jump straight back into editing.</p>
                <span className="hero-spark s1" />
                <span className="hero-spark s2" />
                <span className="hero-spark s3" />
                <span className="hero-spark s4" />
                <span className="hero-spark s5" />
                <span className="hero-spark s6" />
                <span className="hero-spark s7" />
                <span className="hero-spark s8" />
                <span className="hero-ring" />
              </div>
              <div className="section-head">
                <h2>Trending now</h2>
              </div>
              <GalleryGrid
                entries={creations.slice(0, 8)}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onEdit={editPrompt}
                onDelete={setDeleteTarget}
                onView={setViewer}
                onAction={handleAction}
                emptyTitle="Nothing to explore yet"
                emptySub="Generate your first image and it will show up here."
              />
            </section>
          )}

          {activeNav === 'creations' && (
            <section className="results">
              <SectionHead
                title="Creations"
                count={creations.length}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                onSearchToggle={() => setSearchOpen(true)}
                onSearchChange={setSearchQuery}
                onSearchClose={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              />
              <GalleryGrid
                entries={creations}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onEdit={editPrompt}
                onDelete={setDeleteTarget}
                onView={setViewer}
                onAction={handleAction}
                emptyTitle={searchTerm ? 'No matches found' : 'No creations yet'}
                emptySub={
                  searchTerm
                    ? `No image prompt contains “${searchQuery.trim()}”.`
                    : 'Generate an image and it will appear here.'
                }
                withVisual={!searchTerm}
              />
            </section>
          )}

          {activeNav === 'favorites' && (
            <section className="results">
              <SectionHead
                title="Favorites"
                count={favs.length}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                onSearchToggle={() => setSearchOpen(true)}
                onSearchChange={setSearchQuery}
                onSearchClose={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              />
              <GalleryGrid
                entries={favs}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onEdit={editPrompt}
                onDelete={setDeleteTarget}
                onView={setViewer}
                onAction={handleAction}
                emptyTitle={searchTerm ? 'No matches found' : 'No favorites yet'}
                emptySub={
                  searchTerm
                    ? `No favorite prompt contains “${searchQuery.trim()}”.`
                    : 'Tap the heart on any image to save it here.'
                }
                withVisual={!searchTerm}
              />
            </section>
          )}

          {activeNav === 'history' && (
            <section className="results">
              <SectionHead
                title="History"
                count={filteredHistory.length}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                onSearchToggle={() => setSearchOpen(true)}
                onSearchChange={setSearchQuery}
                onSearchClose={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              />
              {filteredHistory.length === 0 ? (
                <div className="empty">
                  {!searchTerm && <EmptyVisual />}
                  <p className="empty-title">{searchTerm ? 'No matches found' : 'No history yet'}</p>
                  <p className="empty-sub">
                    {searchTerm
                      ? `No image prompt contains “${searchQuery.trim()}”.`
                      : 'Your past generations will be listed here.'}
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {filteredHistory.map((entry) => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      isFavorite={favorites.has(entry.id)}
                      onToggleFavorite={toggleFavorite}
                      onView={setViewer}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {viewer && (
        <div className="viewer-overlay" onClick={() => setViewer(null)}>
          <div className="viewer-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Image preview">
            <div className="viewer-head">
              <span className="chip grad-chip">{viewer.width}×{viewer.height}</span>
              <span className="lb-meta">
                {new Date(viewer.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button className="icon-btn icon-btn-sm" aria-label="Close preview" onClick={() => setViewer(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="viewer-media">
              <img src={viewer.url} alt={viewer.prompt} />
            </div>
            <div className="viewer-cap">
              <p>{viewer.prompt}</p>
              <div className="viewer-foot">
                <button className="ghost-btn" onClick={() => setViewer(null)}>Close</button>
                <button
                  className="btn-primary sm"
                  onClick={() => copyText(viewer.url.startsWith('http') ? viewer.url : `${window.location.origin}${viewer.url}`, 'Image URL copied')}
                >
                  <Link2 size={14} /> Copy URL
                </button>
                <a className="btn-primary sm" href={viewer.url} download={`pixora-${viewer.id}.jpg`}>
                  Download <Download size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {warnPrompt && (
        <div className="modal-overlay" onClick={() => setWarnPrompt(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Prompt not understood">
            <div className="modal-icon warn"><AlertTriangle size={24} /></div>
            <h3 className="modal-title">Prompt not understood</h3>
            <p className="modal-text">
              We couldn't make sense of this prompt. Try describing a clear subject, style, and setting with real words.
            </p>
            {prompt && <div className="warn-prompt">{prompt}</div>}
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setWarnPrompt(false)}>Generate anyway</button>
              <button
                className="btn-primary sm"
                onClick={() => {
                  setWarnPrompt(false)
                  setTimeout(() => promptRef.current?.focus(), 60)
                }}
              >
                <PenLine size={14} /> Edit prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => { if (!isDeleting) setDeleteTarget(null) }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm delete">
            <div className="modal-icon"><Trash2 size={22} /></div>
            <h3 className="modal-title">Delete image?</h3>
            <p className="modal-text">
              This permanently removes the image and its history. This can't be undone.
            </p>
            <div className="modal-preview">
              <img src={deleteTarget.url} alt={deleteTarget.prompt} />
              <div className="modal-preview-meta">
                <span className="modal-prompt">{deleteTarget.prompt}</span>
                <span className="modal-dims">{deleteTarget.width}×{deleteTarget.height}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? <span className="mini-spin" /> : <Trash2 size={15} />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pricingOpen && (
        <PricingModal onClose={() => setPricingOpen(false)} onSelect={handleSelectPlan} />
      )}

      {notFound && <NotFoundPage onBack={() => setNotFound(null)} />}

      <BottomNav active={activeNav} onNavigate={handleNavigate} />

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          onDone={async () => {
            const token = authEnabled ? await getAccessToken() : null
            if (token) {
              try {
                await fetch('/api/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ name: settings.name }),
                })
              } catch {}
            }
            setTimeout(() => window.location.reload(), 250)
          }}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onApplyDefaults={({ aspect: a, resolution: r, count: c } = {}) => {
            if (a) setAspect(a)
            if (r) setResolution(r)
            if (c !== undefined) setImageCount(c)
          }}
          onClearHistory={handleClearHistory}
          onClearFavs={handleClearFavs}
          onClearNotifs={handleClearNotifs}
          historyCount={historyEntries.length}
          favCount={favs.length}
          notifCount={notifications.length}
        />
      )}
    </div>
  )
}

function imagesLabel(count) {
  return count === 1 ? '1 image' : `${count} images`
}