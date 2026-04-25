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
