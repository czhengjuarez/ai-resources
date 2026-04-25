-- AI Resources Community Submissions
CREATE TABLE IF NOT EXISTS community_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('material', 'video', 'tool')),
  level TEXT NOT NULL CHECK(level IN ('Beginner', 'Intermediate', 'Advanced')),
  tags TEXT DEFAULT '[]',
  submitted_at TEXT DEFAULT (datetime('now')),
  approved INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_submissions_approved ON community_submissions(approved);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON community_submissions(type);

-- AI Resources (curated collection)
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('material', 'video', 'tool')),
  level TEXT NOT NULL CHECK(level IN ('Beginner', 'Intermediate', 'Advanced')),
  tags TEXT DEFAULT '[]',
  meta TEXT DEFAULT '[]',
  url TEXT NOT NULL,
  is_team_pick INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_resources_section ON resources(section);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_level ON resources(level);

-- Plan feedback from Course Builder
CREATE TABLE IF NOT EXISTS plan_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thumbs INTEGER NOT NULL CHECK(thumbs IN (1, -1)),
  note TEXT,
  plan_background TEXT,
  plan_goal TEXT,
  plan_duration TEXT,
  submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_thumbs ON plan_feedback(thumbs);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON plan_feedback(submitted_at);

-- Resource voting (one vote per browser per resource)
CREATE TABLE IF NOT EXISTS resource_votes (
  resource_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  voted_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (resource_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_resource_id ON resource_votes(resource_id);

-- RSS-discovered resource suggestions (reviewed by admin before adding to library)
CREATE TABLE IF NOT EXISTS resource_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  description TEXT,
  feed_source TEXT,
  discovered_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending_review' CHECK(status IN ('pending_review', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON resource_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_discovered ON resource_suggestions(discovered_at);
