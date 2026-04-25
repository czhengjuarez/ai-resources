import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import { ArrowLeft, ArrowUpRight, BookOpen, Clock, Sparkles, Trash2, Wand2 } from 'lucide-react';

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

const badgeVariantByType = {
  material: 'purple',
  video: 'amber',
  tool: 'green'
};

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
  const [form, setForm] = useState({ background: '', goal: '', duration: '1 week' });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);

  useEffect(() => {
    setSavedPlans(loadSavedPlans());
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function buildPlan() {
    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeletePlan(id, e) {
    e.stopPropagation();
    setSavedPlans(deletePlan(id));
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="container nav-row">
          <div className="brand">
            <span className="brand-mark">
              <Sparkles size={14} />
            </span>
            <span>AI Resource Portal</span>
          </div>
          <Link to="/" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
            <ArrowLeft size={14} />
            Back to resources
          </Link>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <section className="hero" style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow">AI-Powered</p>
          <h1>Course Builder</h1>
          <p className="hero-copy">
            Tell us your background and goals. Our AI will build a personalised learning path
            using resources already in the portal — no hallucinated links, no filler.
          </p>
        </section>

        <form
          onSubmit={handleBuild}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem', alignItems: 'start' }}
        >
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
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

          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
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
            <label htmlFor="duration">Timeframe *</label>
            <select
              id="duration"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              required
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.1rem' }}>
            <button
              type="submit"
              disabled={status === 'loading'}
              className={buttonClass({ variant: 'primary' })}
              style={{ width: '100%' }}
            >
              <Wand2 size={16} />
              {status === 'loading' ? 'Building your plan…' : 'Build my learning plan'}
            </button>
          </div>
        </form>

        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
            <Sparkles size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Crafting your personalised learning plan…</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            background: 'var(--color-red-50, #fef2f2)',
            border: '1px solid var(--color-red-200, #fecaca)',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <span style={{ color: 'var(--color-red-600, #dc2626)', fontSize: 20, lineHeight: 1 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: 'var(--color-red-700, #b91c1c)' }}>
                {errorMsg.includes('no JSON') || errorMsg.includes('empty response')
                  ? 'The AI model is busy right now'
                  : 'Something went wrong'}
              </p>
              <p style={{ margin: '0 0 0.75rem', color: 'var(--color-red-600, #dc2626)', fontSize: '0.875rem' }}>
                {errorMsg.includes('no JSON') || errorMsg.includes('empty response') || errorMsg.includes('malformed')
                  ? 'The AI couldn\'t generate a plan this time. This is usually temporary — please try again.'
                  : errorMsg}
              </p>
              <button
                type="button"
                onClick={handleBuild}
                className={buttonClass({ variant: 'outline', size: 'sm' })}
                style={{ fontSize: '0.8rem' }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {result && (
          <div>
            {result.summary && (
              <div className={cardClass({ className: 'resource-card' })} style={{ marginBottom: '2rem', background: 'var(--color-purple-50, #faf5ff)', border: '1px solid var(--color-purple-200, #e9d5ff)' }}>
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
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--color-purple-600, #7c3aed)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {i + 1}
                    </span>
                    {period.period}
                  </h2>
                  {period.focus && (
                    <span className={badgeClass({ variant: 'purple' })}>{period.focus}</span>
                  )}
                </div>

                {period.notes && (
                  <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
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
                  <p style={{ color: 'var(--color-muted)' }}>No matched resources for this period.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {savedPlans.length > 0 && (
          <section style={{ marginTop: '4rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '2.5rem' }}>
            <div className="section-header" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} />
                Saved Plans
              </h2>
              <span className={badgeClass({ variant: 'default' })}>{savedPlans.length}</span>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {savedPlans.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleLoadPlan(entry)}
                  className={cardClass({ className: 'resource-card' })}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.goal}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                      {entry.duration} &middot; {entry.background.slice(0, 60)}{entry.background.length > 60 ? '…' : ''}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Saved {new Date(entry.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeletePlan(entry.id, e)}
                    title="Delete saved plan"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-muted)',
                      padding: '0.25rem',
                      flexShrink: 0,
                      lineHeight: 1
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
