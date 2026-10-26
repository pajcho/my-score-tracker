import type { PlayerSide } from '@/lib/supabaseDatabase';

/**
 * A rack history is trusted only when it accounts for every point of the
 * score. Games started before history tracking, and scores edited by hand,
 * fall back to plain counters.
 */
export function isRackHistoryComplete(
  rackHistory: readonly PlayerSide[] | undefined,
  score1: number,
  score2: number
): rackHistory is PlayerSide[] {
  if (!rackHistory) return false;
  const player1Wins = rackHistory.filter((side) => side === 'player1').length;
  return player1Wins === score1 && rackHistory.length - player1Wins === score2;
}

/** With a trusted history only the most recent win can be taken back, so undo walks back in play order. */
export function canRemovePoint(
  game: { score1: number; score2: number; rack_history?: PlayerSide[] },
  side: PlayerSide
): boolean {
  const sideScore = side === 'player1' ? game.score1 : game.score2;
  if (sideScore === 0) return false;
  if (!isRackHistoryComplete(game.rack_history, game.score1, game.score2)) return true;
  return game.rack_history.at(-1) === side;
}
