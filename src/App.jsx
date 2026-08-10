import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WandSparkles,
  Wand2,
  Compass,
  Images,
  Heart,
  History as HistoryIcon,
  Settings,
  Bell,
  ChevronDown,
  Download,
  PenLine,
  Maximize2,
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
              {item.id === 'explore' && <span className="nav-chev"><ChevronDown size={14} /></span>}
            </button>
          )
        })}
      </nav>

      <div className="side-bottom">
        <div className="profile-card">
          <Avatar name="Vivek Sharma" />
          <div className="profile-meta">
            <span className="profile-name">Vivek Sharma</span>
            <span className="profile-mail">vivek@pixora.ai</span>
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

function Topbar({ credits, onNew }) {
  return (
    <header className="topbar">
      <div className="top-heading">
        <span className="top-eyebrow">
          <span className="eyebrow-dot" /> AI IMAGE GENERATOR
        </span>
        <h1>Create something extraordinary.</h1>
        <p>Type a prompt, pick a style, and Pixora renders a gallery-ready image.</p>
      </div>
      <div className="top-actions">
        <button className="credits-chip" aria-label="Credits">
          <Gem size={15} fill="currentColor" />
          <span>{credits}</span>
          <span className="credits-label">credits</span>
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="new-btn" onClick={onNew}>
          <Plus size={16} /> New
        </button>
        <Avatar name="Vivek Sharma" />
      </div>
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

function PrintCard({ entry, index }) {
  const time = new Date(entry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const delay = Math.min(index * 70, 420)

  return (
    <article className="result-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="result-thumb">
        <img src={entry.url} alt={entry.prompt} loading="lazy" />
        <div className="result-actions">
          <a className="act-btn" href={entry.url} download title="Download">
            <Download size={16} />
          </a>
          <button className="act-btn" title="Edit">
            <PenLine size={16} />
          </button>
          <button className="act-btn" title="Upscale">
            <Maximize2 size={16} />
          </button>
          <button className="act-btn" title="Favorite">
            <Heart size={16} />
          </button>
          <button className="act-btn" title="More">
            <MoreHorizontal size={16} />
          </button>
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

export default function App() {
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

  const recent = prints.slice(0, 6)

  return (
    <div className="app">
      <Sidebar active={activeNav} onNavigate={setActiveNav} />

      <main className="main">
        <div className="main-body">
          <Topbar credits={120} onNew={() => setPrompt('')} />

          <section className="panel generate-panel">
            <form onSubmit={handleGenerate}>
              <div className="prompt-row">
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create..."
                  maxLength={500}
                  rows={3}
                  required
                />
                <span className="char-count">{prompt.length}/500</span>
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
                  <button className="btn-primary" type="submit" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <span className="spinner" /> Generating {generated}/{imageCount}
                      </>
                    ) : (
                      <>
                        <WandSparkles size={17} strokeWidth={1.8} /> Generate
                      </>
                    )}
                  </button>
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
            <div className="section-head">
              <h2>Result — {imagesLabel(prints.length)}</h2>
              <button className="ghost-btn">
                <Search size={14} /> Search gallery
              </button>
            </div>

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

            {!isGenerating && prints.length === 0 && (
              <div className="empty">
                <span className="empty-icon"><Images size={22} /></span>
                <p className="empty-title">Your gallery is empty</p>
                <p className="empty-sub">Write a prompt above and generate your first image.</p>
              </div>
            )}

            {!isGenerating && prints.length > 0 && (
              <div className="grid">
                {prints.map((entry, i) => (
                  <PrintCard key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="recent">
              <div className="section-head">
                <h2>Recent generations</h2>
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
        </div>
      </main>
    </div>
  )
}

function imagesLabel(count) {
  return count === 1 ? '1 image' : `${count} images`
}