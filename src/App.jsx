import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Heart,
  Moon,
  MoreHorizontal,
  Play,
  PlusCircle,
  Loader2,
  Search,
  Sparkles,
  Sun,
  Users,
  Wand2,
  Wrench,
} from 'lucide-react';
import { sections as staticSections } from './data/resources';

const typeFilters = [
  { id: 'all', label: 'All' },
  { id: 'material', label: 'Materials' },
  { id: 'video', label: 'Videos' },
  { id: 'tool', label: 'AI Tools' },
];

const levelFilters = ['Beginner', 'Intermediate', 'Advanced'];

const sectionIconMap = { GraduationCap, Building2, Play, Wrench };

const badgeVariantByType = { material: 'purple', video: 'amber', tool: 'green' };

function normalize(value) {
  return value.toLowerCase();
}

// Format a D1 created_at string as YYYY.MM.DD
// Returns null if date is invalid or missing
function formatAddedDate(createdAt) {
  if (!createdAt) return null;
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  } catch {
    return null;
  }
}

// Fallback: token-based AND match (used when Vectorize returns no results)
function matchesSearch(resource, query) {
  if (!query) return true;
  const haystack = [
    resource.title,
    resource.source,
    resource.description,
    resource.level,
    ...(resource.tags || []),
    ...(resource.meta || []),
    resource.type,
  ]
    .join(' ')
    .toLowerCase();
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.every(token => haystack.includes(token));
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [panelOpen, setPanelOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [activeLevel, setActiveLevel] = useState('');
  const [search, setSearch] = useState('');
  const [aiQuery, setAiQuery] = useState(''); // committed query sent to Vectorize
  const [searchResultIds, setSearchResultIds] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [communityResources, setCommunityResources] = useState([]);
  const [sections, setSections] = useState(staticSections);
  const [votes, setVotes] = useState({}); // { resource_id: count }
  const [myVotes, setMyVotes] = useState({}); // { resource_id: true } for voted items
  const [votingId, setVotingId] = useState(null); // optimistic loading

  // Get or create a stable voter ID for this browser
  const getVoterId = () => {
    let id = localStorage.getItem('voter_id');
    if (!id) {
      id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('voter_id', id);
    }
    return id;
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Vectorize semantic search — only fires when aiQuery changes (explicit submit)
  useEffect(() => {
    const trimmed = aiQuery.trim();
    if (!trimmed) {
      setSearchResultIds(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setSearchResultIds(data.ids ? new Set(data.ids) : null);
        setSearchLoading(false);
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return;
        setSearchResultIds(null);
        setSearchLoading(false);
      });
    return () => { cancelled = true; controller.abort(); };
  }, [aiQuery]);

  useEffect(() => {
    // Detect mobile
    const mq = window.matchMedia('(max-width: 768px)');
    const handleMq = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setPanelOpen(false);
    };
    handleMq(mq);
    mq.addEventListener('change', handleMq);

    // Load curated resources from D1
    fetch('/api/resources')
      .then((r) => r.json())
      .then((data) => {
        if (data.sections?.length > 0) {
          const merged = staticSections.map((staticSection) => {
            const dbSection = data.sections.find((s) => s.id === staticSection.id);
            return dbSection ? { ...staticSection, resources: dbSection.resources } : staticSection;
          });
          setSections(merged);
        }
      })
      .catch(() => {/* silently fall back to static data in dev */});

    // Load approved community submissions
    fetch('/api/community')
      .then((r) => r.json())
      .then((data) => { if (data.resources) setCommunityResources(data.resources); })
      .catch(() => {});

    // Load vote counts
    fetch('/api/votes')
      .then((r) => r.json())
      .then((data) => { if (data.votes) setVotes(data.votes); })
      .catch(() => {});

    return () => mq.removeEventListener('change', handleMq);
  }, []);

  const handleVote = async (resourceId) => {
    if (votingId === resourceId) return;
    const voterId = getVoterId();
    const wasVoted = !!myVotes[resourceId];
    // Optimistic update
    setVotingId(resourceId);
    setMyVotes((mv) => { const n = { ...mv }; if (wasVoted) delete n[resourceId]; else n[resourceId] = true; return n; });
    setVotes((v) => ({ ...v, [resourceId]: Math.max(0, (v[resourceId] || 0) + (wasVoted ? -1 : 1)) }));
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, voter_id: voterId })
      });
      const data = await res.json();
      if (res.ok) {
        setVotes((v) => ({ ...v, [resourceId]: data.count }));
        setMyVotes((mv) => { const n = { ...mv }; if (data.voted) n[resourceId] = true; else delete n[resourceId]; return n; });
      }
    } catch (_) { /* keep optimistic state */ }
    setVotingId(null);
  };

  const filteredSections = useMemo(() => {
    const query = normalize(search.trim());

    // Build a combined list: curated sections + community as a virtual section
    const allSections = [
      ...sections,
      ...(communityResources.length > 0 ? [{
        id: 'community',
        title: 'Community Picks',
        icon: 'Users',
        resources: communityResources,
      }] : []),
    ];

    return allSections
      .map((section) => ({
        ...section,
        resources: section.resources.filter((resource, rIdx) => {
          const matchesType = activeType === 'all' || resource.type === activeType;
          const matchesLevel = !activeLevel || resource.level === activeLevel;

          // If an AI semantic search was submitted, filter by Vectorize IDs
          // Community resources are not in Vectorize, so fall back to token match for them
          if (searchResultIds !== null && section.id !== 'community') {
            const vectorId = `${section.id}_${rIdx}`;
            return matchesType && matchesLevel && searchResultIds.has(vectorId);
          }

          // Real-time token-based match (instant, no network call)
          return matchesType && matchesLevel && matchesSearch(resource, query);
        }),
      }))
      .filter((section) => section.resources.length > 0);
  }, [activeLevel, activeType, search, sections, searchResultIds, communityResources]);

  const totalResources = sections.reduce((count, s) => count + s.resources.length, 0) + communityResources.length;
  const filteredCount = filteredSections.reduce((count, s) => count + s.resources.length, 0);

  // Panel CSS classes
  const panelClass = [
    'split-panel',
    !panelOpen && !isMobile ? 'collapsed' : '',
    isMobile && panelOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="split-shell">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="portal-header">
        <div className="container nav-row">
          <div className="brand">
            <span className="brand-mark"><Sparkles size={14} /></span>
            <span>AI Resource Portal</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <span className={badgeClass({ variant: 'purple' })}>{totalResources} resources</span>
            {/* Dropdown menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={buttonClass({ variant: 'secondary', size: 'sm' })}
                aria-label="More actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreHorizontal size={15} />
                <ChevronDown size={12} />
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 40,
                    background: 'var(--of-bg-elevated)',
                    border: '1px solid var(--of-border-line)',
                    borderRadius: '8px',
                    padding: '0.375rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    minWidth: '180px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  }}
                >
                  <Link
                    to="/course-builder"
                    className={buttonClass({ variant: 'ghost', size: 'sm' })}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Wand2 size={14} />
                    Build a learning plan
                  </Link>
                  <Link
                    to="/submit"
                    className={buttonClass({ variant: 'ghost', size: 'sm' })}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <PlusCircle size={14} />
                    Submit a resource
                  </Link>
                </div>
              )}
            </div>
            <button
              type="button"
              className="theme-toggle"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Body: main + right panel ──────────────────────────── */}
      <div className="split-body">

        {/* Main card area */}
        <div className="split-main">
          {/* Hero */}
          <section className="hero" style={{ paddingTop: '2rem' }}>
            <p className="eyebrow">Curated · April 2026</p>
            <h1>Learn AI at your own pace, built around what you need.</h1>
            <p style={{ color: 'var(--of-fg-muted)', fontSize: '1rem', lineHeight: '1.6', marginTop: '0.75rem', maxWidth: '56ch' }}>
              A curated library of courses, videos, books, and tools — hand-picked by the team and organized by level.
              Not sure where to start? Use the AI Course Builder for a personalized day-by-day plan.
              Have a resource worth sharing? Submit it for the team to find.
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <Link to="/course-builder" className={buttonClass({ variant: 'primary', size: 'md' })}>
                <Wand2 size={15} />
                Build a learning plan
              </Link>
              <Link to="/submit" className={buttonClass({ variant: 'secondary', size: 'md' })}>
                <PlusCircle size={15} />
                Submit a resource
              </Link>
            </div>
          </section>

          {/* Result count */}
          <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {(() => {
              const typeLabel = activeType === 'all' ? 'resources' : typeFilters.find(f => f.id === activeType)?.label?.toLowerCase() ?? 'resources';
              const levelLabel = activeLevel ? ` · ${activeLevel}` : '';
              const searchLabel = search.trim() ? ` matching "${search.trim()}"` : '';
              return `Showing ${filteredCount} of ${totalResources} ${typeLabel}${levelLabel}${searchLabel}`;
            })()}
            {!panelOpen && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--of-fg-brand)', fontSize: 'inherit', marginLeft: '0.5rem', padding: 0 }}
                onClick={() => setPanelOpen(true)}
              >
                <Filter size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                Filter
              </button>
            )}
          </p>

          {/* Sections (includes Community Picks when they pass filters) */}
          {filteredSections.length === 0 ? (
            <section className="empty-state">
              <h2>No matching resources</h2>
              <p>Try a different search term or reset your filters.</p>
            </section>
          ) : (
            filteredSections.map((section) => {
              const SectionIcon = section.id === 'community' ? Users : (sectionIconMap[section.icon] ?? BookOpen);
              return (
                <section key={section.id} id={section.id} className="section-block">
                  <div className="section-header">
                    <h2>
                      <SectionIcon size={18} />
                      {section.title}
                    </h2>
                    <span>{section.resources.length} resources</span>
                  </div>
                  <div className="card-grid">
                    {section.resources.map((resource, rIdx) => {
                      const resourceId = `${section.id}_${rIdx}`;
                      const voteCount = votes[resourceId] || 0;
                      const voted = !!myVotes[resourceId];
                      return (
                      <article key={`${section.id}-${resource.title ?? rIdx}`} className={cardClass({ className: 'resource-card' })}>
                        <div className="card-top-row">
                          <span className={badgeClass({ variant: badgeVariantByType[resource.type] ?? 'default' })}>
                            {resource.type}
                          </span>
                          <span className={badgeClass({ variant: 'default' })}>{resource.level}</span>
                          {formatAddedDate(resource.created_at) && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--of-fg-subtle)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                              {formatAddedDate(resource.created_at)}
                            </span>
                          )}
                        </div>
                        <h3>{resource.title}</h3>
                        {resource.source && <p className="source">{resource.source}</p>}
                        <p className="desc">{resource.description}</p>
                        <div className="meta-row">
                          {(resource.tags || []).map((tag) => (
                            <span key={tag} className={badgeClass({ variant: 'blue' })}>{tag}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem' }}>
                          <a href={resource.url} target="_blank" rel="noreferrer" className="visit-link">
                            Visit <ArrowUpRight size={14} />
                          </a>
                          {section.id !== 'community' && (
                            <button
                              type="button"
                              className="vote-btn"
                              onClick={() => handleVote(resourceId)}
                              disabled={votingId === resourceId}
                              aria-label={voted ? 'Remove vote' : 'Vote for this resource'}
                              aria-pressed={voted}
                              title={voted ? 'Remove vote' : 'Upvote this resource'}
                              data-voted={voted}
                            >
                              <Heart size={13} />
                              {voteCount > 0 && <span>{voteCount}</span>}
                            </button>
                          )}
                        </div>
                      </article>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Mobile backdrop */}
        {isMobile && panelOpen && (
          <div
            className="slide-overlay open"
            onClick={() => setPanelOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Right filter panel */}
        <aside className={panelClass} aria-label="Filter panel">
          {/* Edge-tab toggle — sits on left border, always visible on desktop */}
          {!isMobile && (
            <button
              type="button"
              className="panel-edge-toggle"
              aria-label={panelOpen ? 'Collapse filter panel' : 'Expand filter panel'}
              onClick={() => setPanelOpen((o) => !o)}
            >
              <Filter size={10} />
              {panelOpen ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
            </button>
          )}

          <div className="split-panel-inner">

            {/* Search */}
            <section>
              <p className="panel-section-title">Search</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = search.trim();
                  if (q) setAiQuery(q);
                }}
                style={{ display: 'flex', gap: '0.375rem' }}
              >
                <label className="search-box" style={{ maxWidth: 'none', flex: 1 }}>
                  <input
                    type="text"
                    value={search}
                    placeholder="Filter resources…"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      // Clear AI search results when user edits the query
                      if (searchResultIds !== null) {
                        setSearchResultIds(null);
                        setAiQuery('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearch('');
                        setSearchResultIds(null);
                        setAiQuery('');
                      }
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className={buttonClass({ variant: 'secondary', size: 'sm' })}
                  title="AI semantic search"
                  disabled={!search.trim() || searchLoading}
                  style={{ flexShrink: 0 }}
                >
                  {searchLoading ? <Loader2 size={14} className="search-spinner" /> : <Sparkles size={14} />}
                </button>
              </form>
              <p style={{ fontSize: '0.72rem', color: 'var(--of-fg-subtle)', marginTop: '0.35rem' }}>
                {searchResultIds !== null
                  ? 'AI results active — edit to reset'
                  : 'Type to filter · press ✦ for AI search'}
              </p>
              {search.trim() && activeType === 'all' && !searchLoading && (
                <p style={{ fontSize: '0.75rem', color: 'var(--of-fg-muted)', marginTop: '0.25rem' }}>
                  Tip: select a type below to narrow results.
                </p>
              )}
              {!search.trim() && (
                <p style={{ fontSize: '0.75rem', color: 'var(--of-fg-subtle)', marginTop: '0.4rem' }}>
                  Semantic search — try "video", "beginner python", or "LLM agent".
                </p>
              )}
            </section>

            {/* Type filter */}
            <section className="filter-panel-group">
              <p className="panel-section-title">
                <Filter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Type
              </p>
              <div className="filter-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {typeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={buttonClass({
                      variant: activeType === filter.id ? 'primary' : 'secondary',
                      size: 'sm',
                    })}
                    onClick={() => { setActiveType(filter.id); setActiveLevel(''); }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Level filter */}
            <section className="filter-panel-group">
              <p className="panel-section-title">Level</p>
              <div className="filter-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {levelFilters.map((level) => {
                  const active = activeLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      className={buttonClass({ variant: active ? 'tint' : 'ghost', size: 'sm' })}
                      onClick={() => setActiveLevel(active ? '' : level)}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Reset */}
            {(activeType !== 'all' || activeLevel || search) && (
              <button
                type="button"
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
                onClick={() => { setActiveType('all'); setActiveLevel(''); setSearch(''); setAiQuery(''); setSearchResultIds(null); }}
              >
                Reset filters
              </button>
            )}


          </div>
        </aside>
      </div>
    </div>
  );
}
