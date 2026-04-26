import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PanelRightOpen,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wand2,
} from 'lucide-react';

const STORAGE_KEY = 'ai-course-builder-plans';
const MAX_SAVED = 10;
const SECTIONS_KEY = 'ai-course-builder-panel-sections';

function loadSectionState() {
  try {
    const v = JSON.parse(localStorage.getItem(SECTIONS_KEY) || 'null');
    if (v && typeof v === 'object') return v;
  } catch {}
  return null;
}

function persistSectionState(s) {
  try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(s)); } catch {}
}

function loadSavedPlans() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function defaultTitle(form) {
  const g = (form.goal || '').trim();
  if (!g) return `Plan · ${form.duration}`;
  const short = g.length > 60 ? `${g.slice(0, 57)}…` : g;
  return short;
}

function savePlan(form, result) {
  const plans = loadSavedPlans();
  const entry = {
    id: Date.now(),
    savedAt: new Date().toISOString(),
    title: (form.title && form.title.trim()) || defaultTitle(form),
    background: form.background,
    goal: form.goal,
    duration: form.duration,
    result,
  };
  const updated = [entry, ...plans].slice(0, MAX_SAVED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

function deletePlan(id) {
  const plans = loadSavedPlans().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  return plans;
}

const DURATIONS = ['1 day', '3 days', '1 week', '2 weeks', '1 month', '3 months'];

const EXAMPLES = [
  {
    label: 'Absolute beginner',
    background: 'No coding experience. I use spreadsheets at work.',
    goal: 'Understand what AI is and start using AI tools to be more productive.',
    duration: '1 week',
  },
  {
    label: 'Developer learning ML',
    background: 'Software engineer, comfortable with Python. No ML experience.',
    goal: 'Build and deploy a simple machine learning model end-to-end.',
    duration: '2 weeks',
  },
  {
    label: 'Product manager',
    background: 'PM at a tech company. Non-technical but work closely with AI teams.',
    goal: 'Understand LLMs, prompt engineering, and how to evaluate AI features.',
    duration: '3 days',
  },
  {
    label: 'Deep learning dive',
    background: 'ML engineer with PyTorch experience. Want to go deeper on transformers.',
    goal: 'Understand transformer architecture from first principles and read current research papers.',
    duration: '1 month',
  },
];

const badgeVariantByType = { material: 'purple', video: 'amber', tool: 'green' };

function normalizePlanResult(result, duration) {
  const durationDaysMap = { '1 day': 1, '3 days': 3, '1 week': 5, '2 weeks': 10, '1 month': 20 };
  const durationHoursMap = { '1 day': 8, '3 days': 24, '1 week': 40, '2 weeks': 80, '1 month': 160 };
  const numDays = durationDaysMap[duration] || 5;
  const totalBudget = durationHoursMap[duration] || 40;
  const dayMax = 8;
  const levelRank = { Beginner: 1, Intermediate: 2, Advanced: 3 };

  const rawPlan = Array.isArray(result?.plan) ? result.plan : [];
  const hasSessionMetadata = rawPlan.some((period) =>
    (period.resources || []).some((resource) =>
      resource.sessionHours != null || resource.originalHours != null
    )
  );

  // If backend already provided session-aware scheduling metadata,
  // keep it as-is to avoid double-compressing long courses.
  if (hasSessionMetadata) {
    return result;
  }

  const focusByKey = {};
  const orderedResources = [];
  const seen = new Set();

  for (const period of rawPlan) {
    for (const resource of period.resources || []) {
      const key = resource.url || resource.id || resource.title;
      if (!focusByKey[key] && period.focus) {
        focusByKey[key] = period.focus;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      orderedResources.push(resource);
    }
  }

  const sessions = [];
  const deferredTitles = [];
  for (const resource of orderedResources) {
    const key = resource.url || resource.id || resource.title;
    const hours = resource.hours;
    const originalHours = hours == null ? null : Math.max(1, Number(hours));

    const remainingBudget = totalBudget - sessions.reduce((sum, s) => sum + s.sessionHours, 0);
    if (originalHours != null && originalHours > 10 && remainingBudget < 8) {
      deferredTitles.push(resource.title);
      continue;
    }

    if (hours == null) {
      sessions.push({ key, sessionHours: 2, originalHours: null, resource, openEnded: true });
      continue;
    }

    let remaining = originalHours;
    while (remaining > 0) {
      let chunk;
      if (remaining <= dayMax) {
        chunk = remaining;
      } else if (remaining <= 12) {
        chunk = Math.ceil(remaining / 2);
      } else {
        chunk = dayMax;
      }
      sessions.push({ key, sessionHours: chunk, originalHours, resource, openEnded: false });
      remaining -= chunk;
    }
  }

  let used = 0;
  const bounded = [];
  for (const s of sessions) {
    if (used + s.sessionHours > totalBudget) break;
    bounded.push(s);
    used += s.sessionHours;
  }

  const days = Array.from({ length: numDays }, (_, i) => ({
    period: `Day ${i + 1}`,
    focus: '',
    notes: '',
    resources: [],
    resourceIds: [],
    plannedHours: 0,
  }));

  for (const session of bounded) {
    let target = 0;
    for (let i = 1; i < days.length; i++) {
      if (days[i].plannedHours < days[target].plannedHours) {
        target = i;
      }
    }

    const day = days[target];
    const key = session.key;
    day.resources.push({
      ...session.resource,
      hours: session.sessionHours,
      sessionHours: session.sessionHours,
      originalHours: session.originalHours,
      partial: session.originalHours != null && session.sessionHours < session.originalHours,
    });
    day.resourceIds.push(key);
    day.plannedHours += session.sessionHours;
    if (!day.focus) {
      day.focus = focusByKey[key] || 'Focused learning';
    }
  }

  const plan = days
    .filter((d) => d.resources.length > 0)
    .map((d) => ({
      period: d.period,
      focus: d.focus,
      notes: `Plan ~${d.plannedHours}h today (ideal range: 4-8h). Difficulty: ${d.resources.reduce((acc, r) => {
        const rank = levelRank[r.level] || 1;
        return rank > acc.rank ? { rank, label: r.level } : acc;
      }, { rank: 1, label: 'Beginner' }).label}.`,
      resourceIds: d.resourceIds,
      resources: d.resources,
    }));

  const beyondNote = deferredTitles.length > 0
    ? ` Beyond this plan: ${[...new Set(deferredTitles)].slice(0, 3).join(', ')}${deferredTitles.length > 3 ? '…' : ''}.`
    : '';

  const summary = `${result?.summary || 'Personalized plan generated.'} Sustainable pacing applied (~${used}h total, 4-8h/day target).${beyondNote}`;

  return { ...result, plan, summary };
}

function AccordionHeader({ label, open, onToggle, badge }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        padding: '0.5rem 0',
        marginBottom: open ? '0.75rem' : 0,
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--of-border-line)',
        cursor: 'pointer',
        color: 'var(--of-fg-default)',
        textAlign: 'left',
        font: 'inherit',
      }}
    >
      <span className="panel-section-title" style={{ margin: 0 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        {badge != null && (
          <span className={badgeClass({ variant: 'default' })}>{badge}</span>
        )}
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            color: 'var(--of-fg-muted)',
          }}
        />
      </span>
    </button>
  );
}

function ResourceCard({ resource }) {
  const todayHours = resource.sessionHours ?? resource.hours ?? null;
  const totalHours = resource.originalHours ?? null;

  return (
    <article className={cardClass({ className: 'resource-card' })}>
      <div className="card-top-row">
        <span className={badgeClass({ variant: badgeVariantByType[resource.type] ?? 'default' })}>
          {resource.type}
        </span>
        <span className={badgeClass({ variant: 'default' })}>{resource.level}</span>
      </div>
      <h3>{resource.title}</h3>
      {resource.scheduleSpanLabel && (
        <p style={{ fontSize: '0.7rem', color: 'var(--of-fg-subtle)', fontFamily: 'monospace', margin: '0 0 0.2rem', letterSpacing: '0.02em' }}>
          {resource.scheduleSpanLabel}
        </p>
      )}
      {todayHours != null && (
        <p style={{ fontSize: '0.72rem', color: 'var(--of-fg-subtle)', fontFamily: 'monospace', margin: '0 0 0.25rem', letterSpacing: '0.02em' }}>
          {totalHours != null && totalHours > todayHours
            ? `~${todayHours}h scheduled · ~${totalHours}h full`
            : `~${todayHours}h`}
        </p>
      )}
      {resource.reductionReason && (
        <p style={{
          fontSize: '0.72rem',
          color: 'var(--of-fg-muted)',
          background: 'color-mix(in srgb, var(--of-amber-500, #f59e0b) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--of-amber-500, #f59e0b) 25%, transparent)',
          borderRadius: 6,
          padding: '0.4rem 0.5rem',
          margin: '0 0 0.5rem',
          lineHeight: 1.45,
        }}>
          <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
            Why less than full?
          </strong>
          {resource.reductionReason}
        </p>
      )}
      <p className="source">{resource.source}</p>
      {resource.tags?.length > 0 && (
        <div className="meta-row">
          {resource.tags.map((tag) => (
            <span key={tag} className={badgeClass({ variant: 'blue' })}>{tag}</span>
          ))}
        </div>
      )}
      <a href={resource.url} target="_blank" rel="noreferrer" className="visit-link">
        Visit <ArrowUpRight size={14} />
      </a>
    </article>
  );
}

export default function CourseBuilderPage() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [form, setForm] = useState({ title: '', background: '', goal: '', duration: '1 week' });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackNote, setShowFeedbackNote] = useState(false);
  const [panelSections, setPanelSections] = useState(
    () => loadSectionState() || { form: true, examples: true, saved: false }
  );

  function toggleSection(key) {
    setPanelSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistSectionState(next);
      return next;
    });
  }

  function applySectionState(next) {
    setPanelSections(next);
    persistSectionState(next);
  }

  useEffect(() => {
    setSavedPlans(loadSavedPlans());
    const mq = window.matchMedia('(max-width: 768px)');
    const handleMq = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setPanelOpen(false);
    };
    handleMq(mq);
    mq.addEventListener('change', handleMq);
    return () => mq.removeEventListener('change', handleMq);
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function fillExample(ex) {
    setForm({ title: ex.label, background: ex.background, goal: ex.goal, duration: ex.duration });
    if (isMobile) setPanelOpen(false);
  }

  async function submitFeedback(thumbs) {
    setFeedback(thumbs === 1 ? 'up' : 'down');
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbs,
          note: feedbackNote || null,
          plan_background: form.background,
          plan_goal: form.goal,
          plan_duration: form.duration,
        }),
      });
      setFeedbackSubmitted(true);
      setShowFeedbackNote(false);
    } catch (_) {
      // fail silently — feedback is best-effort
    }
  }

  async function buildPlan() {
    setStatus('loading');
    setResult(null);
    setErrorMsg('');
    setFeedback(null);
    setFeedbackNote('');
    setFeedbackSubmitted(false);
    setShowFeedbackNote(false);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      const normalized = normalizePlanResult(data, form.duration);
      setResult(normalized);
      setStatus('idle');
      setSavedPlans(savePlan(form, normalized));
      // Auto-collapse form/examples and reveal saved plans once a plan exists.
      applySectionState({ form: false, examples: false, saved: true });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  function handleBuild(e) {
    if (e && e.preventDefault) e.preventDefault();
    buildPlan();
  }

  function handleLoadPlan(entry) {
    setForm({
      title: entry.title || '',
      background: entry.background,
      goal: entry.goal,
      duration: entry.duration,
    });
    setResult(entry.result);
    setStatus('idle');
    setErrorMsg('');
    if (isMobile) setPanelOpen(false);
  }

  function handleDeletePlan(id, e) {
    e.stopPropagation();
    setSavedPlans(deletePlan(id));
  }

  const panelClass = [
    'split-panel',
    !panelOpen && !isMobile ? 'collapsed' : '',
    isMobile && panelOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="split-shell">
      {/* Header */}
      <header className="portal-header">
        <div className="container nav-row">
          <div className="brand">
            <span className="brand-mark"><Sparkles size={14} /></span>
            <span>AI Resource Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Body: output (left/main) + panel (right) */}
      <div className="split-body">

        {/* Main output area */}
        <div className="split-main">
          {/* Page title */}
          <div style={{ marginBottom: '2rem' }}>
            <p className="eyebrow">AI-Powered</p>
            <h1 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0.5rem' }}>Course Builder</h1>
            <p style={{ color: 'var(--of-fg-muted)', maxWidth: 540, lineHeight: 1.6, margin: 0 }}>
              Tell us your background and goals. Our AI will build a personalised learning path
              using resources already in the portal — no hallucinated links, no filler.
            </p>
          </div>

          {/* Loading */}
          {status === 'loading' && (
            <div className="split-empty-state">
              <Sparkles size={40} />
              <p>Crafting your personalised learning plan…</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{
              background: 'color-mix(in srgb, #dc2626 8%, var(--of-bg-base))',
              border: '1px solid color-mix(in srgb, #dc2626 30%, transparent)',
              borderRadius: 8,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.375rem', fontWeight: 600 }}>
                  {errorMsg.includes('no JSON') || errorMsg.includes('empty response')
                    ? 'The AI model is busy right now'
                    : 'Something went wrong'}
                </p>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--of-fg-muted)' }}>
                  {errorMsg.includes('no JSON') || errorMsg.includes('empty response') || errorMsg.includes('malformed')
                    ? "The AI couldn't generate a plan this time. This is usually temporary — please try again."
                    : errorMsg}
                </p>
                <button type="button" onClick={handleBuild} className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Result */}
            {result && status !== 'loading' && (
            <div>
              {result.summary && (() => {
                const totalHours = result.plan.reduce((sum, period) => {
                  return sum + (period.resources || []).reduce((s, r) => s + (r.hours ?? 0), 0);
                }, 0);
                return (
                  <div
                    className={cardClass()}
                    style={{
                      marginBottom: '2rem',
                      borderColor: 'color-mix(in srgb, var(--of-fg-brand) 30%, transparent)',
                      background: 'color-mix(in srgb, var(--of-fg-brand) 5%, var(--of-bg-elevated))',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <BookOpen size={16} />
                      <strong>Your learning path</strong>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
                    {totalHours > 0 && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--of-fg-muted)', fontFamily: 'monospace' }}>
                        Estimated total: ~{totalHours}h
                      </p>
                    )}
                  </div>
                );
              })()}

              {result.plan.map((period, i) => {
                const periodHours = (period.resources || []).reduce((s, r) => s + (r.hours ?? 0), 0);
                return (
                <div key={i} style={{ marginBottom: '2.5rem' }}>
                  <div className="section-header" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--of-magenta-600, #7c3aed)', color: '#fff',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      {period.period}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {period.focus && <span className={badgeClass({ variant: 'purple' })}>{period.focus}</span>}
                      {periodHours > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--of-fg-subtle)', fontFamily: 'monospace' }}>
                          ~{periodHours}h
                        </span>
                      )}
                    </div>
                  </div>
                  {period.notes && (
                    <p style={{ color: 'var(--of-fg-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                      {period.notes}
                    </p>
                  )}
                  {period.resources?.length > 0 ? (
                    <div className="card-grid">
                      {period.resources.map((resource) => (
                        <ResourceCard key={resource.url} resource={resource} />
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--of-fg-muted)' }}>No matched resources for this period.</p>
                  )}
                </div>
                );
              })}

              {/* Enhancements: full-length courses that exceed the timeframe */}
              {Array.isArray(result.enhancements) && result.enhancements.length > 0 && (
                <div style={{
                  marginTop: '0.5rem',
                  marginBottom: '2rem',
                  padding: '1.25rem',
                  border: '1px solid var(--of-border-line)',
                  borderRadius: 10,
                  background: 'color-mix(in srgb, var(--of-fg-brand) 4%, var(--of-bg-elevated))',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Sparkles size={16} />
                    <strong>If you have more time</strong>
                  </div>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--of-fg-muted)', lineHeight: 1.5 }}>
                    These full-length courses are too long to fit your current timeframe and aren't recommended to skim. Consider them as natural next steps.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {result.enhancements.map((e) => (
                      <div key={e.id || e.url} style={{
                        padding: '0.75rem 0.875rem',
                        border: '1px solid var(--of-border-line)',
                        borderRadius: 8,
                        background: 'var(--of-bg-base)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span className={badgeClass({ variant: badgeVariantByType[e.type] ?? 'default' })}>{e.type}</span>
                          <span className={badgeClass({ variant: 'default' })}>{e.level}</span>
                          {e.hours != null && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--of-fg-subtle)', fontFamily: 'monospace' }}>
                              ~{e.hours}h full
                            </span>
                          )}
                        </div>
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', color: 'var(--of-fg-default)' }}
                        >
                          {e.title} <ArrowUpRight size={13} />
                        </a>
                        {e.source && (
                          <p style={{ margin: '0.15rem 0 0.4rem', fontSize: '0.78rem', color: 'var(--of-fg-muted)' }}>
                            {e.source}
                          </p>
                        )}
                        {e.reason && (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--of-fg-muted)', lineHeight: 1.5 }}>
                            {e.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback widget */}
              <div style={{
                borderTop: '1px solid var(--of-border-line)',
                paddingTop: '1.5rem',
                marginTop: '1rem',
              }}>
                {feedbackSubmitted ? (
                  <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem', margin: 0 }}>
                    Thanks for the feedback! It helps us improve the AI planner.
                  </p>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MessageSquare size={14} /> Was this plan helpful?
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => { submitFeedback(1); }}
                        className={buttonClass({ variant: feedback === 'up' ? 'primary' : 'secondary', size: 'sm' })}
                        style={feedback === 'up' ? { background: 'color-mix(in srgb, var(--of-green-500) 15%, transparent)', borderColor: 'var(--of-green-500)' } : {}}
                      >
                        <ThumbsUp size={14} /> Yes, helpful
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFeedback('down'); setShowFeedbackNote(true); }}
                        className={buttonClass({ variant: feedback === 'down' ? 'secondary' : 'secondary', size: 'sm' })}
                        style={feedback === 'down' ? { borderColor: 'var(--of-red-500)', color: 'var(--of-red-500)' } : {}}
                      >
                        <ThumbsDown size={14} /> Needs improvement
                      </button>
                    </div>

                    {/* Optional note for thumbs down */}
                    {showFeedbackNote && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 480 }}>
                        <textarea
                          rows={2}
                          placeholder="What could be improved? (optional)"
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem',
                            border: '1px solid var(--of-border-line)',
                            borderRadius: '6px', fontSize: '0.875rem',
                            background: 'var(--of-bg-base)',
                            color: 'var(--of-fg-default)',
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => submitFeedback(-1)}
                            className={buttonClass({ variant: 'primary', size: 'sm' })}
                          >
                            Submit feedback
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowFeedbackNote(false); setFeedback(null); }}
                            className={buttonClass({ variant: 'ghost', size: 'sm' })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && status === 'idle' && (
            <div className="split-empty-state">
              <Wand2 size={48} />
              <p style={{ margin: 0, maxWidth: 320 }}>
                Fill in the form on the right and hit <strong>Build my plan</strong> to generate your personalised learning path.
              </p>
              {!panelOpen && (
                <button
                  type="button"
                  className={buttonClass({ variant: 'secondary', size: 'sm' })}
                  onClick={() => setPanelOpen(true)}
                >
                  <PanelRightOpen size={14} />
                  Open panel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile backdrop */}
        {isMobile && panelOpen && (
          <div className="slide-overlay open" onClick={() => setPanelOpen(false)} aria-hidden="true" />
        )}

        {/* Right panel */}
        <aside className={panelClass} aria-label="Course builder panel">
          {/* Edge-tab toggle — sits on left border, always visible on desktop */}
          {!isMobile && (
            <button
              type="button"
              className="panel-edge-toggle"
              aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
              onClick={() => setPanelOpen((o) => !o)}
            >
              <Wand2 size={10} />
              {panelOpen ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
            </button>
          )}

          <div className="split-panel-inner">

            {/* Form */}
            <section>
              <AccordionHeader
                label="Build your plan"
                open={panelSections.form}
                onToggle={() => toggleSection('form')}
              />
              {panelSections.form && (
              <form onSubmit={handleBuild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-field">
                  <label htmlFor="title">Plan title <span style={{ color: 'var(--of-fg-subtle)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Transformers deep dive"
                    maxLength={80}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="background">Your background *</label>
                  <textarea
                    id="background"
                    name="background"
                    rows={2}
                    required
                    value={form.background}
                    onChange={handleChange}
                    placeholder="e.g. Software engineer, comfortable with Python, no ML experience"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="goal">What do you want to learn? *</label>
                  <textarea
                    id="goal"
                    name="goal"
                    rows={2}
                    required
                    value={form.goal}
                    onChange={handleChange}
                    placeholder="e.g. Build LLM-powered apps, understand transformers, get started with ML"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="duration">Timeframe</label>
                  <select id="duration" name="duration" value={form.duration} onChange={handleChange} required>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className={buttonClass({ variant: 'primary' })}
                >
                  <Wand2 size={15} />
                  {status === 'loading' ? 'Building…' : 'Build my plan'}
                </button>
              </form>
              )}
            </section>

            {/* Example prompt cards */}
            <section>
              <AccordionHeader
                label="Try an example"
                open={panelSections.examples}
                onToggle={() => toggleSection('examples')}
              />
              {panelSections.examples && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {EXAMPLES.map((ex) => (
                  <div
                    key={ex.label}
                    className="builder-example-card"
                    onClick={() => fillExample(ex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fillExample(ex)}
                  >
                    <p className="builder-example-title">{ex.label}</p>
                    <p className="builder-example-text"><strong>Goal:</strong> {ex.goal}</p>
                    <p className="builder-example-text" style={{ marginBottom: '0.5rem' }}>
                      <strong>Duration:</strong> {ex.duration}
                    </p>
                    <button type="button" className="builder-use-btn">Use this example →</button>
                  </div>
                ))}
              </div>
              )}
            </section>

            {/* Saved plans */}
            {savedPlans.length > 0 && (
              <section>
                <AccordionHeader
                  label="Saved plans"
                  open={panelSections.saved}
                  onToggle={() => toggleSection('saved')}
                  badge={savedPlans.length}
                />
                {panelSections.saved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {savedPlans.map((entry) => (
                    <div
                      key={entry.id}
                      className="saved-plan-row"
                      onClick={() => handleLoadPlan(entry)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadPlan(entry)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.title || entry.goal}
                        </p>
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--of-fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.duration} · {new Date(entry.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeletePlan(entry.id, e)}
                        title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--of-fg-muted)', padding: '0.125rem', flexShrink: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </section>
            )}

          </div>
        </aside>

      </div>
    </div>
  );
}
