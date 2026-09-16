-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events (game sessions)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (char_length(code) BETWEEN 4 AND 8),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  max_players INTEGER NOT NULL DEFAULT 40 CHECK (max_players BETWEEN 2 AND 100),
  questions JSONB NOT NULL,
  answer_time_seconds INTEGER NOT NULL DEFAULT 120 CHECK (answer_time_seconds BETWEEN 30 AND 600),
  discovery_time_seconds INTEGER NOT NULL DEFAULT 300 CHECK (discovery_time_seconds BETWEEN 60 AND 1800),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  username TEXT NOT NULL CHECK (char_length(username) BETWEEN 1 AND 30),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_id UUID REFERENCES players(id),
  found_at TIMESTAMPTZ,
  found_by_id UUID REFERENCES players(id),
  is_host BOOLEAN NOT NULL DEFAULT false,

  -- Username must be unique per event
  CONSTRAINT unique_username_per_event UNIQUE (event_id, username),

  -- No self-targeting
  CONSTRAINT no_self_target CHECK (target_id IS NULL OR target_id != id)
);

-- Each player is a target at most once within an event
CREATE UNIQUE INDEX idx_unique_target ON players(event_id, target_id)
  WHERE target_id IS NOT NULL;

-- Answers
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  answer_text TEXT NOT NULL CHECK (char_length(answer_text) BETWEEN 1 AND 500),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One answer per question per player
  CONSTRAINT unique_answer_per_question UNIQUE (player_id, question_index)
);

-- Score Events (audit trail)
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  reason TEXT NOT NULL CHECK (reason IN ('finder', 'found')),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate scores
  CONSTRAINT unique_score_per_reason UNIQUE (event_id, player_id, reason)
);

-- Game State
CREATE TABLE game_state (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  current_phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (current_phase IN ('lobby', 'answering', 'discovery', 'ended')),
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  phase_ends_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_players_event ON players(event_id);
CREATE INDEX idx_answers_event ON answers(event_id);
CREATE INDEX idx_answers_player ON answers(player_id);
CREATE INDEX idx_score_events_event ON score_events(event_id);
CREATE INDEX idx_score_events_player ON score_events(player_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events (public read for join, host-only write)
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Anyone can create events" ON events FOR INSERT WITH CHECK (true);

-- RLS Policies for players
CREATE POLICY "Players are viewable by event participants" ON players FOR SELECT
  USING (event_id IN (SELECT event_id FROM players WHERE id = auth.uid()));
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);

-- RLS Policies for answers (players see own + their target's)
CREATE POLICY "Answers viewable by owner or their hunter" ON answers FOR SELECT
  USING (
    player_id = auth.uid()
    OR player_id IN (
      SELECT target_id FROM players WHERE id = auth.uid()
    )
    OR player_id IN (
      SELECT id FROM players WHERE target_id = auth.uid()
    )
  );
CREATE POLICY "Players can insert own answers" ON answers FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for score_events (public read for leaderboard)
CREATE POLICY "Score events are viewable by all" ON score_events FOR SELECT USING (true);

-- RLS Policies for game_state (public read)
CREATE POLICY "Game state is viewable by all" ON game_state FOR SELECT USING (true);

-- Function to generate random event code
CREATE OR REPLACE FUNCTION generate_event_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate event code
CREATE OR REPLACE FUNCTION set_event_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_event_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_event_code
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_code();

-- Enable Supabase Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
ALTER PUBLICATION supabase_realtime ADD TABLE score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;

