export const COLLECTIBLE_KINDS = ['meijo-stamp', 'goshuin', 'castle-card'] as const;

export type CollectibleKind = (typeof COLLECTIBLE_KINDS)[number];

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
  'meijoStamp' | 'goshuin' | 'castleCard'
> = {
  'meijo-stamp': 'meijoStamp',
  goshuin: 'goshuin',
  'castle-card': 'castleCard',
};

export function isCollectibleKind(value: string): value is CollectibleKind {
  return (COLLECTIBLE_KINDS as readonly string[]).includes(value);
}

export function isSingleFileCollectibleKind(kind: CollectibleKind): boolean {
  return kind === 'meijo-stamp';
}
