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

/** How many racks in a row the most recent winner has taken, or null before the first rack. */
export function getWinningStreak(rackHistory: readonly PlayerSide[]): { side: PlayerSide; length: number } | null {
  const side = rackHistory.at(-1);
  if (!side) return null;
  let length = 0;
  while (length < rackHistory.length && rackHistory[rackHistory.length - 1 - length] === side) {
    length += 1;
  }
  return { side, length };
}

export interface StreakTier {
  label: string;
  /** Emojis the streak winner may send to their opponent. */
  tauntEmojis: string[];
  /** From five in a row the winner can drop several emojis at once. */
  allowsMix: boolean;
}

/** Streak banners start at two in a row; every extra win unlocks a nastier taunt. */
export function getStreakTier(streakLength: number): StreakTier | null {
  if (streakLength < 2) return null;
  if (streakLength === 2) return { label: 'Double!', tauntEmojis: ['💩'], allowsMix: false };
  if (streakLength === 3) return { label: 'Triple!', tauntEmojis: ['💩', '🖕'], allowsMix: false };
  if (streakLength === 4) return { label: 'Quadra!', tauntEmojis: ['💩', '🖕', '🍆'], allowsMix: false };
  return { label: 'K.O.!', tauntEmojis: ['💩', '🖕', '🍆'], allowsMix: true };
}
