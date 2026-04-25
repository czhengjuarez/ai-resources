import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import { ArrowLeft, Check, Trash2, Clock, ExternalLink, AlertCircle, ThumbsUp, ThumbsDown, Rss, Zap } from 'lucide-react';

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('key') || '';

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [rssRunning, setRssRunning] = useState(false);

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/admin-api/submissions?key=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load submissions');
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedback() {
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/admin-api/feedback?key=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (res.ok) setFeedbackData(data);
    } catch (_) {
      // fail silently
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function loadSuggestions() {
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/admin-api/suggestions?key=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (res.ok) setSuggestions(data.suggestions || []);
    } catch (_) {
      // fail silently
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function handleRunRss() {
    setRssRunning(true);
    setActionMsg('');
    try {
      const res = await fetch(`/admin-api/run-rss?key=${encodeURIComponent(adminKey)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`✓ RSS scan complete — ${data.added} new suggestion${data.added !== 1 ? 's' : ''} found`);
        await loadSuggestions();
      } else {
        setActionMsg(`Error: ${data.error || 'RSS scan failed'}`);
      }
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setRssRunning(false);
      setTimeout(() => setActionMsg(''), 5000);
    }
  }

  async function handleApproveSuggestion(suggestion) {
    // Use sensible defaults; admin can edit later
    const section = 'industry';
    const type = 'material';
    const level = 'Beginner';
    try {
      const res = await fetch(`/admin-api/approve-suggestion?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: suggestion.id, section, type, level, tags: [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      setActionMsg(`✓ "${suggestion.title}" added to library (ID: ${data.new_resource_id})`);
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  async function handleRejectSuggestion(id) {
    try {
      const res = await fetch(`/admin-api/reject-suggestion?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  useEffect(() => {
    if (adminKey) {
      loadSubmissions();
      loadFeedback();
      loadSuggestions();
    } else {
      setLoading(false);
      setFeedbackLoading(false);
      setSuggestionsLoading(false);
      setError('No admin key provided. Access this page as /admin?key=YOUR_SECRET');
    }
  }, [adminKey]);

  async function handleApprove(id) {
    try {
      const res = await fetch(`/admin-api/approve?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      setActionMsg(`✓ Submission #${id} approved`);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, approved: 1 } : s));
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  async function handleReject(id) {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    try {
      const res = await fetch(`/admin-api/reject?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      setActionMsg(`✓ Submission #${id} deleted`);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  const pending = submissions.filter(s => s.approved === 0);
  const approved = submissions.filter(s => s.approved === 1);

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="container nav-row">
          <div className="brand">
            <span className="brand-mark">🛡</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Admin Review</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <ArrowLeft size={14} />Back to portal
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">Community submissions</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0.5rem' }}>
            Review Queue
          </h1>
          <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>
            Approve resources to show them in Community Picks. Delete spam or low-quality submissions.
          </p>
        </div>

        {/* Action message */}
        {actionMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'color-mix(in srgb, var(--of-green-500) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--of-green-500) 30%, transparent)',
            borderRadius: '8px',
            color: 'var(--of-green-700, var(--of-fg-default))',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {actionMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'color-mix(in srgb, var(--of-red-500) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--of-red-500) 30%, transparent)',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--of-red-600, #dc2626)' }}>
              <AlertCircle size={16} />
              <strong style={{ fontSize: '0.875rem' }}>{error}</strong>
            </div>
          </div>
        )}

        {loading && (
          <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>Loading submissions…</p>
        )}

        {!loading && !error && (
          <>
            {/* Pending section */}
            <section style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Pending</h2>
                <span className={badgeClass({ variant: pending.length > 0 ? 'orange' : 'gray' })}>
                  {pending.length}
                </span>
              </div>

              {pending.length === 0 && (
                <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>No pending submissions.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pending.map(sub => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showActions
                  />
                ))}
              </div>
            </section>

            {/* Approved section */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Approved (live)</h2>
                <span className={badgeClass({ variant: 'green' })}>{approved.length}</span>
              </div>

              {approved.length === 0 && (
                <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>No approved submissions yet.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {approved.map(sub => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showActions={false}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Course Builder Feedback */}
        {!feedbackLoading && feedbackData && (
          <section style={{ marginTop: '3rem', borderTop: '1px solid var(--of-border-line)', paddingTop: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="eyebrow">AI Course Builder</p>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.25rem 0 0.5rem' }}>Plan Feedback</h2>
              <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem', margin: 0 }}>
                Thumbs up/down ratings from users on generated learning plans.
              </p>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div className={cardClass()} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ThumbsUp size={20} style={{ color: 'var(--of-green-500, #22c55e)' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{feedbackData.upCount}</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--of-fg-muted)' }}>Helpful</p>
                </div>
              </div>
              <div className={cardClass()} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ThumbsDown size={20} style={{ color: 'var(--of-red-500, #ef4444)' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{feedbackData.downCount}</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--of-fg-muted)' }}>Needs improvement</p>
                </div>
              </div>
              <div className={cardClass()} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{feedbackData.total}</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--of-fg-muted)' }}>Total ratings</p>
                </div>
              </div>
            </div>

            {/* Feedback with notes */}
            {feedbackData.feedback.filter(f => f.note).length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--of-fg-muted)' }}>
                  Written feedback
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {feedbackData.feedback.filter(f => f.note).map(f => (
                    <div
                      key={f.id}
                      style={{
                        padding: '0.875rem 1.125rem',
                        border: '1px solid var(--of-border-line)',
                        borderRadius: '8px',
                        background: 'var(--of-bg-elevated)',
                        display: 'flex',
                        gap: '0.875rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      {f.thumbs === 1
                        ? <ThumbsUp size={14} style={{ color: 'var(--of-green-500, #22c55e)', flexShrink: 0, marginTop: 2 }} />
                        : <ThumbsDown size={14} style={{ color: 'var(--of-red-500, #ef4444)', flexShrink: 0, marginTop: 2 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem' }}>{f.note}</p>
                        {f.plan_goal && (
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--of-fg-muted)' }}>
                            Goal: {f.plan_goal} · {f.plan_duration}
                          </p>
                        )}
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.7rem', color: 'var(--of-fg-subtle)' }}>
                          {new Date(f.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedbackData.total === 0 && (
              <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>No feedback yet.</p>
            )}
          </section>
        )}

        {/* RSS Suggestions section */}
        <section style={{ marginTop: '3rem', borderTop: '1px solid var(--of-border-line)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <p className="eyebrow">Auto-Discovery</p>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.25rem 0 0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Rss size={16} />
                  RSS Suggestions
                </span>
              </h2>
              <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem', margin: 0 }}>
                Resources discovered automatically from Anthropic, fast.ai, Hugging Face, Google AI, and Papers With Code feeds.
                Runs every Monday at 9am UTC. Review and approve to add to the library.
              </p>
            </div>
            <button
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              onClick={handleRunRss}
              disabled={rssRunning}
              style={{ flexShrink: 0 }}
            >
              <Zap size={14} />
              {rssRunning ? 'Scanning…' : 'Run scan now'}
            </button>
          </div>

          {suggestionsLoading && (
            <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>Loading suggestions…</p>
          )}

          {!suggestionsLoading && suggestions.length === 0 && (
            <p style={{ color: 'var(--of-fg-muted)', fontSize: '0.875rem' }}>
              No pending suggestions. Click "Run scan now" to check feeds for new resources.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {suggestions.map(sug => (
              <div key={sug.id} className={cardClass()} style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{sug.title}</strong>
                      <span className={badgeClass({ variant: 'blue', size: 'sm' })}>{sug.feed_source}</span>
                    </div>
                    {sug.description && (
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--of-fg-muted)' }}>
                        {sug.description.slice(0, 200)}{sug.description.length > 200 ? '…' : ''}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <a
                        href={sug.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--of-fg-brand)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        {sug.url.slice(0, 60)}{sug.url.length > 60 ? '…' : ''}
                        <ExternalLink size={11} />
                      </a>
                      <span style={{ fontSize: '0.75rem', color: 'var(--of-fg-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} />{new Date(sug.discovered_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      className={buttonClass({ variant: 'primary', size: 'sm' })}
                      onClick={() => handleApproveSuggestion(sug)}
                    >
                      <Check size={14} />Add to library
                    </button>
                    <button
                      className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      onClick={() => handleRejectSuggestion(sug.id)}
                    >
                      <Trash2 size={14} />Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SubmissionCard({ sub, onApprove, onReject, showActions }) {
  return (
    <div className={cardClass()} style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <strong style={{ fontSize: '0.95rem' }}>{sub.title}</strong>
            <span className={badgeClass({ variant: 'blue', size: 'sm' })}>{sub.type}</span>
            <span className={badgeClass({ variant: 'purple', size: 'sm' })}>{sub.level}</span>
            {sub.approved === 1 && <span className={badgeClass({ variant: 'green', size: 'sm' })}>Live</span>}
          </div>

          {sub.source && (
            <p style={{ margin: '0 0 0.25rem', color: 'var(--of-fg-muted)', fontSize: '0.8rem' }}>
              {sub.source}
            </p>
          )}
          {sub.description && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--of-fg-default)' }}>
              {sub.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href={sub.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: 'var(--of-fg-brand)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {sub.url.slice(0, 60)}{sub.url.length > 60 ? '…' : ''}
              <ExternalLink size={11} />
            </a>
            <span style={{ fontSize: '0.75rem', color: 'var(--of-fg-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={11} />{new Date(sub.submitted_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
          {showActions ? (
            <>
              <button
                className={buttonClass({ variant: 'primary', size: 'sm' })}
                onClick={() => onApprove(sub.id)}
              >
                <Check size={14} />Approve
              </button>
              <button
                className={buttonClass({ variant: 'danger', size: 'sm' })}
                onClick={() => onReject(sub.id)}
                style={{ '--btn-color': 'var(--of-red-600, #dc2626)' }}
              >
                <Trash2 size={14} />Delete
              </button>
            </>
          ) : (
            <button
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              onClick={() => onReject(sub.id)}
            >
              <Trash2 size={14} />Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
