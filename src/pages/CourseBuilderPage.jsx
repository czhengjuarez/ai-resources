import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
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

function loadSavedPlans() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePlan(form, result) {
  const plans = loadSavedPlans();
  const entry = {
    id: Date.now(),
    savedAt: new Date().toISOString(),
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

const DURATIONS = ['1 day', '3 days', '1 week', '2 weeks', '1 month'];

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

function ResourceCard({ resource }) {
  return (
    <article className={cardClass({ className: 'resource-card' })}>
      <div className="card-top-row">
        <span className={badgeClass({ variant: badgeVariantByType[resource.type] ?? 'default' })}>
          {resource.type}
        </span>
        <span className={badgeClass({ variant: 'default' })}>{resource.level}</span>
      </div>
      <h3>{resource.title}</h3>
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
  const [form, setForm] = useState({ background: '', goal: '', duration: '1 week' });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackNote, setShowFeedbackNote] = useState(false);

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
    setForm({ background: ex.background, goal: ex.goal, duration: ex.duration });
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
      setResult(data);
      setStatus('idle');
      setSavedPlans(savePlan(form, data));
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
    setForm({ background: entry.background, goal: entry.goal, duration: entry.duration });
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
              {result.summary && (
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
                </div>
              )}

              {result.plan.map((period, i) => (
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
                    {period.focus && <span className={badgeClass({ variant: 'purple' })}>{period.focus}</span>}
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
              ))}

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
              <p className="panel-section-title" style={{ marginBottom: '1rem' }}>Build your plan</p>
              <form onSubmit={handleBuild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            </section>

            {/* Example prompt cards */}
            <section>
              <p className="panel-section-title" style={{ marginBottom: '0.75rem' }}>Try an example</p>
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
            </section>

            {/* Saved plans */}
            {savedPlans.length > 0 && (
              <section>
                <div className="builder-panel-header">
                  <p className="panel-section-title" style={{ margin: 0 }}>Saved plans</p>
                  <span className={badgeClass({ variant: 'default' })}>{savedPlans.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
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
                          {entry.goal}
                        </p>
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--of-fg-muted)' }}>
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
              </section>
            )}

          </div>
        </aside>

      </div>
    </div>
  );
}
