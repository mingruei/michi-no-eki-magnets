export type CastleProgress = {
  visited: boolean;
  meijoStamp: boolean;
  goshuin: boolean;
};

export type CastleProgressMap = Record<number, CastleProgress>;

export const EMPTY_CASTLE_PROGRESS: CastleProgress = {
  visited: false,
  meijoStamp: false,
  goshuin: false,
};

export type CastleProgressField = keyof CastleProgress;
