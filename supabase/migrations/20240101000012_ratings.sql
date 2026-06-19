-- Sport skills (predefined per sport)
CREATE TABLE sport_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, name)
);

-- User's advertised skills (what others can rate them on)
CREATE TABLE user_skills (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES sport_skills(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

-- Turf ratings (one row per user+turf, all params in JSONB)
CREATE TABLE turf_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turf_id UUID NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  parameters JSONB NOT NULL DEFAULT '{}',
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, turf_id)
);

-- Player skill ratings (one row per rater+player+skill)
CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES sport_skills(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rater_id, player_id, skill_id),
  CHECK (rater_id != player_id)
);

-- Indexes
CREATE INDEX idx_turf_ratings_turf_id ON turf_ratings(turf_id);
CREATE INDEX idx_player_ratings_player_id ON player_ratings(player_id);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

-- RLS
ALTER TABLE sport_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_skills_public_read" ON sport_skills FOR SELECT USING (true);

-- Seed sport skills
INSERT INTO sport_skills (sport_id, name, display_name)
SELECT s.id, v.name, v.display_name
FROM sports s
JOIN (VALUES
  ('cricket',      'batting',        'Batting'),
  ('cricket',      'bowling',        'Bowling'),
  ('cricket',      'fielding',       'Fielding'),
  ('cricket',      'wicket_keeping', 'Wicket Keeping'),
  ('cricket',      'all_rounder',    'All-Rounder'),
  ('football',     'striker',        'Striker'),
  ('football',     'midfielder',     'Midfielder'),
  ('football',     'defender',       'Defender'),
  ('football',     'goalkeeper',     'Goalkeeper'),
  ('football',     'dribbling',      'Dribbling'),
  ('basketball',   'shooting',       'Shooting'),
  ('basketball',   'dribbling',      'Dribbling'),
  ('basketball',   'defense',        'Defense'),
  ('basketball',   'passing',        'Passing'),
  ('basketball',   'rebounding',     'Rebounding'),
  ('badminton',    'smash',          'Smash'),
  ('badminton',    'defense',        'Defense'),
  ('badminton',    'net_play',       'Net Play'),
  ('badminton',    'serving',        'Serving'),
  ('badminton',    'footwork',       'Footwork'),
  ('tennis',       'serving',        'Serving'),
  ('tennis',       'forehand',       'Forehand'),
  ('tennis',       'backhand',       'Backhand'),
  ('tennis',       'footwork',       'Footwork'),
  ('tennis',       'net_play',       'Net Play'),
  ('volleyball',   'serving',        'Serving'),
  ('volleyball',   'spiking',        'Spiking'),
  ('volleyball',   'blocking',       'Blocking'),
  ('volleyball',   'setting',        'Setting'),
  ('volleyball',   'digging',        'Digging'),
  ('hockey',       'dribbling',      'Dribbling'),
  ('hockey',       'shooting',       'Shooting'),
  ('hockey',       'defending',      'Defending'),
  ('hockey',       'goalkeeping',    'Goalkeeping'),
  ('hockey',       'passing',        'Passing'),
  ('table-tennis', 'forehand',       'Forehand'),
  ('table-tennis', 'backhand',       'Backhand'),
  ('table-tennis', 'serve_return',   'Serve & Return'),
  ('table-tennis', 'footwork',       'Footwork'),
  ('table-tennis', 'spin',           'Spin Control')
) AS v(slug, name, display_name) ON s.slug = v.slug;
