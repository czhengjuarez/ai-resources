import { useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';

const TYPES = ['material', 'video', 'tool'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const defaultForm = {
  title: '',
  url: '',
  source: '',
  description: '',
  type: 'material',
  level: 'Beginner',
  tags: ''
};

export default function SubmitPage() {
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      setStatus('success');
      setForm(defaultForm);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
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
          <Link
            to="/"
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            <ArrowLeft size={14} />
            Back to resources
          </Link>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 640, paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <section className="hero" style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">Community</p>
          <h1>Submit a resource</h1>
          <p className="hero-copy">
            Know a great AI course, video, or tool? Share it with the team.
            Submissions are reviewed before they appear on the portal.
          </p>
        </section>

        {status === 'success' ? (
          <div className={cardClass({ className: 'resource-card' })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem', textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--color-green-600, #16a34a)" />
            <h2 style={{ margin: 0 }}>Thanks for your submission!</h2>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>
              We&apos;ll review it and add it to the portal if it&apos;s a good fit.
            </p>
            <button
              type="button"
              className={buttonClass({ variant: 'primary' })}
              onClick={() => setStatus('idle')}
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-field">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. fast.ai Practical Deep Learning"
              />
            </div>

            <div className="form-field">
              <label htmlFor="url">URL *</label>
              <input
                id="url"
                name="url"
                type="url"
                required
                value={form.url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="source">Source / Author</label>
              <input
                id="source"
                name="source"
                type="text"
                value={form.source}
                onChange={handleChange}
                placeholder="e.g. fast.ai, Andrew Ng, Google"
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Brief summary of what this resource covers and why it's useful."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label htmlFor="type">Type *</label>
                <select id="type" name="type" value={form.type} onChange={handleChange} required>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="level">Level *</label>
                <select id="level" name="level" value={form.level} onChange={handleChange} required>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="tags">Tags <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(comma-separated)</span></label>
              <input
                id="tags"
                name="tags"
                type="text"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g. deep learning, pytorch, free"
              />
            </div>

            {status === 'error' && (
              <p style={{ color: 'var(--color-red-600, #dc2626)', margin: 0 }}>
                Error: {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={status === 'loading'}
                className={buttonClass({ variant: 'primary' })}
              >
                {status === 'loading' ? 'Submitting…' : 'Submit resource'}
              </button>
              <span className={badgeClass({ variant: 'default' })}>
                Pending review
              </span>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
