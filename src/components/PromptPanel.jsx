import { Lightbulb, X } from 'lucide-react';

/**
 * PromptPanel — slide-out left nav with prompt tips / example templates.
 *
 * Props:
 *   open        {boolean}   — whether the panel is visible
 *   onClose     {function}  — called when user dismisses
 *   mode        {'browse'|'builder'}  — which set of tips to show
 *   onFill      {function}  — (field, value) => void  (builder mode only)
 */
export default function PromptPanel({ open, onClose, mode = 'browse', onFill }) {
  const isBrowse = mode === 'browse';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`slide-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className={`slide-panel${open ? ' open' : ''}`} aria-label="Prompt tips panel">
        <div className="panel-header">
          <span className="panel-title">
            <Lightbulb size={15} />
            {isBrowse ? 'How to use' : 'Prompt ideas'}
          </span>
          <button className="panel-close" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>

        <div className="panel-body">
          {isBrowse ? <BrowseTips /> : <BuilderTips onFill={onFill} />}
        </div>
      </aside>
    </>
  );
}

/* ── Browse / main page tips ── */
function BrowseTips() {
  return (
    <>
      <div className="panel-section">
        <span className="panel-section-label">Finding resources</span>
        <p className="panel-tip">
          Use the type filters to narrow down to <strong>Materials</strong>,{' '}
          <strong>Videos</strong>, or <strong>AI Tools</strong>.
        </p>
        <p className="panel-tip">
          Filter by level — <strong>Beginner</strong> resources need no prior ML
          knowledge. <strong>Advanced</strong> assumes math & coding experience.
        </p>
        <p className="panel-tip">
          Use the search box to find resources by keyword — try{' '}
          <em>"LangChain"</em>, <em>"deep learning"</em>, or <em>"prompt"</em>.
        </p>
      </div>

      <div className="panel-section">
        <span className="panel-section-label">Build a learning plan</span>
        <p className="panel-tip">
          Head to the <strong>Course Builder</strong> to get a personalised day-by-day
          plan using resources from this library. Tell it your background, your goal,
          and how much time you have.
        </p>
      </div>

      <div className="panel-section">
        <span className="panel-section-label">Suggest a resource</span>
        <p className="panel-tip">
          Found something great? Use <strong>Submit a Resource</strong> in the nav to
          propose it to the team. Approved picks show up as <em>Community Picks</em>.
        </p>
      </div>
    </>
  );
}

/* ── Course Builder tips ── */
const EXAMPLE_PLANS = [
  {
    title: 'The absolute beginner',
    background: 'No coding or math background. I work in marketing and want to understand AI tools better.',
    goal: 'Understand what AI and machine learning are, feel confident discussing them with engineers, and start using AI tools in my daily work.',
    duration: '1 week',
  },
  {
    title: 'Engineer learning ML',
    background: 'Software engineer with 3 years Python experience. Familiar with data structures and basic statistics.',
    goal: 'Build and train my first ML model, understand neural networks, and be able to read ML papers.',
    duration: '1 month',
  },
  {
    title: 'PM exploring AI agents',
    background: 'Product manager. Comfortable with APIs and product thinking. Some exposure to LLMs through ChatGPT.',
    goal: 'Understand how AI agents and multi-agent frameworks work so I can write better specs and evaluate feasibility.',
    duration: '3 days',
  },
  {
    title: 'Deep learning deep dive',
    background: 'Data scientist with ML experience. Know scikit-learn and pandas. Want to go deeper into neural networks.',
    goal: 'Master deep learning fundamentals, train models in PyTorch, and understand transformer architecture.',
    duration: '2 weeks',
  },
];

function BuilderTips({ onFill }) {
  return (
    <>
      <div className="panel-section">
        <span className="panel-section-label">How it works</span>
        <p className="panel-tip">
          Describe your background, your learning goal, and how long you have. The AI
          builds a structured plan using only resources from this library — no made-up
          links.
        </p>
        <p className="panel-tip">
          Be specific about your goal for the best results. Vague goals like{' '}
          <em>"learn AI"</em> give generic plans. Specific goals give focused ones.
        </p>
      </div>

      <div className="panel-section">
        <span className="panel-section-label">Example plans — click to use</span>
        {EXAMPLE_PLANS.map((plan) => (
          <div key={plan.title} className="prompt-card">
            <span className="prompt-card-title">{plan.title}</span>
            <p className="prompt-card-text">
              <strong>Background:</strong> {plan.background}
            </p>
            <p className="prompt-card-text">
              <strong>Goal:</strong> {plan.goal}
            </p>
            <p className="prompt-card-text">
              <strong>Duration:</strong> {plan.duration}
            </p>
            <button
              className="prompt-fill-btn"
              onClick={() => {
                onFill?.('background', plan.background);
                onFill?.('goal', plan.goal);
                onFill?.('duration', plan.duration);
              }}
            >
              Use this example
            </button>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <span className="panel-section-label">Tips for better plans</span>
        <p className="panel-tip">
          ✦ Mention your <strong>job role</strong> — it helps calibrate the right level.
        </p>
        <p className="panel-tip">
          ✦ State what you want to <strong>be able to do</strong>, not just what you
          want to "understand".
        </p>
        <p className="panel-tip">
          ✦ If your plan looks off, tweak your background description and regenerate.
        </p>
      </div>
    </>
  );
}
