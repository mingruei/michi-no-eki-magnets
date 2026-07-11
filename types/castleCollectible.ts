export type CollectibleKind = 'goshuin' | 'castle-card';

export type CastleCollectible = {
  id: string;
  castleId: number;
  kind: CollectibleKind;
  uri: string;
  filename: string;
  mimeType: string | null;
  createdAt: number;
};

export const COLLECTIBLE_PROGRESS_FIELD: Record<
  CollectibleKind,
  'goshuin' | 'castleCard'
> = {
  goshuin: 'goshuin',
  'castle-card': 'castleCard',
};
