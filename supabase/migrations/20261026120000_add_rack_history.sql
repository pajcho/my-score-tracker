-- Ordered winners of each rack/game ('player1' | 'player2'), so a score like
-- 3-2 also records who won which game and score decrements can undo the
-- most recent win first.
-- live_games: player1 = creator, player2 = opponent (same as score1/score2).
-- scores: player1 = scores.user_id, player2 = their opponent (same as "a-b" in scores.score).
-- Rows created before this column exist keep an empty history; the app only
-- trusts a history whose length matches the score.
ALTER TABLE public.live_games
  ADD COLUMN rack_history TEXT[] NOT NULL DEFAULT '{}'
  CONSTRAINT live_games_rack_history_sides_check
    CHECK (rack_history <@ ARRAY['player1', 'player2']::TEXT[]);

ALTER TABLE public.scores
  ADD COLUMN rack_history TEXT[] NOT NULL DEFAULT '{}'
  CONSTRAINT scores_rack_history_sides_check
    CHECK (rack_history <@ ARRAY['player1', 'player2']::TEXT[]);
