import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeClass, buttonClass, cardClass } from '@ops-forward/keel';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Filter,
  GraduationCap,
  Play,
  PlusCircle,
  Search,
  Sparkles,
  Users,
  Wand2,
  Wrench
} from 'lucide-react';
import { sections as staticSections } from './data/resources';

const typeFilters = [
  { id: 'all', label: 'All' },
  { id: 'material', label: 'Materials' },
  { id: 'video', label: 'Videos' },
  { id: 'tool', label: 'AI Tools' }
];

const levelFilters = ['Beginner', 'Intermediate', 'Advanced'];

const sectionIconMap = {
  GraduationCap,
  Building2,
  Play,
  Wrench
};

const badgeVariantByType = {
  material: 'purple',
  video: 'amber',
  tool: 'green'
};

function normalize(value) {
  return value.toLowerCase();
}

function matchesSearch(resource, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    resource.title,
    resource.source,
    resource.description,
    resource.level,
    ...resource.tags,
    ...resource.meta,
    resource.type
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export default function App() {
  const [activeType, setActiveType] = useState('all');
  const [activeLevel, setActiveLevel] = useState('');
  const [search, setSearch] = useState('');
  const [communityResources, setCommunityResources] = useState([]);
  const [sections, setSections] = useState(staticSections);

  useEffect(() => {
    // Load curated resources from D1
    fetch('/api/resources')
      .then((r) => r.json())
      .then((data) => {
        if (data.sections && data.sections.length > 0) {
          // Merge DB sections with static section metadata (title, icon)
          const merged = staticSections.map((staticSection) => {
            const dbSection = data.sections.find((s) => s.id === staticSection.id);
            return dbSection
              ? { ...staticSection, resources: dbSection.resources }
              : staticSection;
          });
          setSections(merged);
        }
      })
      .catch(() => {/* silently fall back to static data in dev */});

    // Load approved community submissions
    fetch('/api/community')
      .then((r) => r.json())
      .then((data) => {
        if (data.resources) setCommunityResources(data.resources);
      })
      .catch(() => {});
  }, []);

  const filteredSections = useMemo(() => {
    const query = normalize(search.trim());

    return sections
      .map((section) => {
        const resources = section.resources.filter((resource) => {
          const matchesType = activeType === 'all' || resource.type === activeType;
          const matchesLevel = !activeLevel || resource.level === activeLevel;
          return matchesType && matchesLevel && matchesSearch(resource, query);
        });

        return { ...section, resources };
      })
      .filter((section) => section.resources.length > 0);
  }, [activeLevel, activeType, search]);

  const totalResources = sections.reduce((count, s) => count + s.resources.length, 0);

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
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={badgeClass({ variant: 'purple' })}>{totalResources} resources</span>
            <Link to="/course-builder" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <Wand2 size={14} />
              Course Builder
            </Link>
            <Link to="/submit" className={buttonClass({ variant: 'primary', size: 'sm' })}>
              <PlusCircle size={14} />
              Submit
            </Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <p className="eyebrow">Curated · April 2026</p>
          <h1>Learn AI with trusted courses, videos, and tools</h1>
          <p className="hero-copy">
            Built with React + Vite and styled with the Keel design system primitives.
          </p>
        </section>

        <section className="filters" aria-label="Resource filters">
          <div className="filter-row">
            <span className="filter-label">
              <Filter size={14} />
              Type
            </span>
            <div className="filter-actions">
              {typeFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={buttonClass({
                    variant: activeType === filter.id ? 'primary' : 'secondary',
                    size: 'sm'
                  })}
                  onClick={() => {
                    setActiveType(filter.id);
                    setActiveLevel('');
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="level-row">
            <span className="filter-label">Level</span>
            <div className="filter-actions">
              {levelFilters.map((level) => {
                const active = activeLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    className={buttonClass({
                      variant: active ? 'tint' : 'ghost',
                      size: 'sm'
                    })}
                    onClick={() => setActiveLevel(active ? '' : level)}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              type="search"
              value={search}
              placeholder="Search resources"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </section>

        {filteredSections.length === 0 ? (
          <section className="empty-state">
            <h2>No matching resources</h2>
            <p>Try a different search term or reset your filter selection.</p>
          </section>
        ) : (
          filteredSections.map((section) => {
            const SectionIcon = sectionIconMap[section.icon] ?? BookOpen;

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
                  {section.resources.map((resource) => (
                    <article key={`${section.id}-${resource.title}`} className={cardClass({ className: 'resource-card' })}>
                      <div className="card-top-row">
                        <span className={badgeClass({ variant: badgeVariantByType[resource.type] ?? 'default' })}>
                          {resource.type}
                        </span>
                        <span className={badgeClass({ variant: 'default' })}>{resource.level}</span>
                      </div>

                      <h3>{resource.title}</h3>
                      <p className="source">{resource.source}</p>
                      <p className="desc">{resource.description}</p>

                      <div className="meta-row">
                        {resource.tags.map((tag) => (
                          <span key={tag} className={badgeClass({ variant: 'blue' })}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      <a href={resource.url} target="_blank" rel="noreferrer" className="visit-link">
                        Visit
                        <ArrowUpRight size={14} />
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        )}
        {communityResources.length > 0 && (
          <section id="community" className="section-block">
            <div className="section-header">
              <h2>
                <Users size={18} />
                Community Picks
              </h2>
              <span>{communityResources.length} resources</span>
            </div>

            <div className="card-grid">
              {communityResources.map((resource) => (
                <article key={`community-${resource.id}`} className={cardClass({ className: 'resource-card' })}>
                  <div className="card-top-row">
                    <span className={badgeClass({ variant: badgeVariantByType[resource.type] ?? 'default' })}>
                      {resource.type}
                    </span>
                    <span className={badgeClass({ variant: 'default' })}>{resource.level}</span>
                  </div>

                  <h3>{resource.title}</h3>
                  {resource.source && <p className="source">{resource.source}</p>}
                  {resource.description && <p className="desc">{resource.description}</p>}

                  <div className="meta-row">
                    {(resource.tags || []).map((tag) => (
                      <span key={tag} className={badgeClass({ variant: 'blue' })}>{tag}</span>
                    ))}
                  </div>

                  <a href={resource.url} target="_blank" rel="noreferrer" className="visit-link">
                    Visit
                    <ArrowUpRight size={14} />
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
