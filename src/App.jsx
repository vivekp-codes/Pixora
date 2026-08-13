import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WandSparkles,
  Brain,
  Wand2,
  Compass,
  Images,
  Heart,
  History as HistoryIcon,
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
} from 'lucide-react'

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

function Sidebar({ active, onNavigate }) {
  const items = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'creations', label: 'Creations', icon: Images },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'history', label: 'History', icon: HistoryIcon },
  ]

  return (
    <aside className="sidebar">
      <div className="side-logo">
        <img src="/pixora.png" alt="Pixora" className="logo-img" />
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
        <Avatar name="Alex" />
          <div className="profile-meta">
            <span className="profile-name">Akshay Kumar</span>
            <span className="profile-mail">akshay@pixora.ai</span>
          </div>
          <button className="icon-btn icon-btn-sm" aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>
        <div className="plan-card">
          <span className="plan-tag">PLAN</span>
          <span className="plan-name">Pro · 128 credits</span>
          <button className="plan-btn">Upgrade</button>
        </div>
      </div>
    </aside>
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

function Topbar({ credits, onNew, theme, onToggleTheme, notifications, notifOpen, onToggleNotif, onClearAll, onDeleteNotif, onNotifItem, showHero }) {
  const unread = notifications.filter((n) => !n.read).length
  const notifRef = useRef(null)
  const vidRef = useRef(null)
  const [vidSeam, setVidSeam] = useState(false)

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) onToggleNotif(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen, onToggleNotif])

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
        <Avatar name="Vivek Sharma" />
      </div>

      {showHero && (
        <div className="hero-greeting">
          <h2>Hello, Alex</h2>
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
              autoPlay
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

function GalleryGrid({ entries, favorites, onToggleFavorite, onEdit, onDelete, onView, onAction, emptyTitle, emptySub }) {
  const [showMore, setShowMore] = useState(false)
  useEffect(() => setShowMore(false), [entries])

  if (entries.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon"><Images size={22} /></span>
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

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pixora-theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [activeNav, setActiveNav] = useState('generate')
  const [prints, setPrints] = useState([])
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(0)

  const [aspect, setAspect] = useState(ASPECTS[0])
  const [resolution, setResolution] = useState(RESOLUTIONS[1])
  const [imageCount, setImageCount] = useState(IMAGE_OPTIONS[0])
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
  const [favorites, setFavorites] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('pixora-favs') || '[]'))
    } catch {
      return new Set()
    }
  })

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
    localStorage.setItem('pixora-favs', JSON.stringify([...favorites]))
  }, [favorites])

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

  function toggleFavorite(entry) {
    const adding = !favorites.has(entry.id)
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(entry.id)) next.delete(entry.id)
      else next.add(entry.id)
      return next
    })
    if (adding) {
      pushNotification('favorite', 'Added to favorites', {
        url: entry.url,
        prompt: entry.prompt,
        width: entry.width,
        height: entry.height,
      })
    }
  }

  function pushNotification(type, message, image = null) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, width, height }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
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
      return copyText(`${window.location.origin}${entry.url}`, 'Image URL copied')
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
        headers: { 'Content-Type': 'application/json' },
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

  useEffect(() => {
    if (loadedHistory.current) return
    loadedHistory.current = true

    fetch('/api/history')
      .then((res) => res.json())
      .then((history) => setPrints(history))
      .catch((err) => console.error("Couldn't load history:", err))
  }, [])

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

    const finalPrompt = trimmed

    setIsGenerating(true)
    setGenerated(0)
    try {
      const created = []
      for (let i = 0; i < imageCount; i++) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  const recent = prints.filter((p) => !p._pending).slice(0, 8)

  function handleNavigate(id) {
    setActiveNav(id)
    setSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="app">
      <Sidebar active={activeNav} onNavigate={handleNavigate} />

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
              />
            </section>
          )}

          {activeNav === 'history' && (
            <section className="results">
              <div className="section-head">
                <h2>History — {imagesLabel(historyEntries.length)}</h2>
              </div>
              {historyEntries.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon"><HistoryIcon size={22} /></span>
                  <p className="empty-title">No history yet</p>
                  <p className="empty-sub">Your past generations will be listed here.</p>
                </div>
              ) : (
                <div className="history-list">
                  {historyEntries.map((entry) => (
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
                  onClick={() => copyText(`${window.location.origin}${viewer.url}`, 'Image URL copied')}
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
    </div>
  )
}

function imagesLabel(count) {
  return count === 1 ? '1 image' : `${count} images`
}