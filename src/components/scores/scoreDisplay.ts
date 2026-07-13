import { Score } from '@/lib/supabaseDatabase';

export type ScoreWithFriend = Score & { friend_name?: string | null };
export type ScoreResult = 'win' | 'loss' | 'tie';

export function getScoreResult(scoreString: string, isCreator: boolean): ScoreResult {
  const [score1, score2] = scoreString.split('-').map(Number);
  const userScore = isCreator ? score1 : score2;
  const opponentScore = isCreator ? score2 : score1;
  if (userScore > opponentScore) return 'win';
  if (userScore < opponentScore) return 'loss';
  return 'tie';
}

export function getOpponentDisplayName(score: ScoreWithFriend): string {
  return score.friend_name || score.opponent_name || 'Unknown';
}

/** Score as the current user reads it: their points first. */
export function getPerspectiveScore(score: ScoreWithFriend, isOwnScore: boolean): string {
  const [score1, score2] = score.score.split('-');
  return isOwnScore ? `${score1}–${score2}` : `${score2}–${score1}`;
}

export const resultStripeStyles: Record<ScoreResult, string> = {
  win: 'bg-secondary',
  loss: 'bg-destructive',
  tie: 'bg-accent',
};

export const resultScoreStyles: Record<ScoreResult, string> = {
  win: 'text-secondary',
  loss: 'text-destructive',
  tie: 'text-accent',
};
