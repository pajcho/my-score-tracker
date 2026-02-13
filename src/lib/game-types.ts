export const GAME_TYPE_OPTIONS = [
  { value: 'Pool', label: 'Pool' },
  { value: 'Ping Pong', label: 'Ping Pong' },
] as const;

export type GameType = (typeof GAME_TYPE_OPTIONS)[number]['value'];

export const POOL_TYPE_OPTIONS = [
  { value: '8-ball', label: '8-Ball' },
  { value: '9-ball', label: '9-Ball' },
  { value: '10-ball', label: '10-Ball' },
] as const;

export type PoolType = (typeof POOL_TYPE_OPTIONS)[number]['value'];

const gameTypeLabelMap: Record<GameType, string> = GAME_TYPE_OPTIONS.reduce(
  (labelMap, gameTypeOption) => {
    labelMap[gameTypeOption.value] = gameTypeOption.label;
    return labelMap;
  },
  {} as Record<GameType, string>
);

const poolTypeLabelMap: Record<PoolType, string> = POOL_TYPE_OPTIONS.reduce(
  (labelMap, poolTypeOption) => {
    labelMap[poolTypeOption.value] = poolTypeOption.label;
    return labelMap;
  },
  {} as Record<PoolType, string>
);

export const DEFAULT_GAME_TYPE: GameType = 'Pool';
export const DEFAULT_POOL_TYPE: PoolType = '9-ball';

export const isPoolGameType = (gameType: string): gameType is 'Pool' => gameType === 'Pool';

export const getGameTypeLabel = (gameType: string): string => {
  return gameTypeLabelMap[gameType as GameType] || gameType;
};

export const getPoolTypeLabel = (poolType: string): string => {
  return poolTypeLabelMap[poolType as PoolType] || poolType;
};

export const getDisplayGameLabel = (gameType: string, poolType?: string | null): string => {
  if (isPoolGameType(gameType) && poolType) {
    return `Pool (${getPoolTypeLabel(poolType)})`;
  }

  return getGameTypeLabel(gameType);
};
