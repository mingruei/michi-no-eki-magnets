import type { CollectibleKind } from '../types/castleCollectible';
import type { ImageDimensions } from './getImageDimensions';

const ORIENTATION_TOLERANCE = 0.05;

export type CollectibleTypeSuggestion = {
  kind: CollectibleKind;
  confidence: 'high' | 'medium' | 'low';
};

export function detectCollectibleKind(dimensions: ImageDimensions): CollectibleTypeSuggestion {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) {
    return { kind: 'goshuin', confidence: 'low' };
  }

  const landscapeRatio = width / height;

  if (landscapeRatio > 1 + ORIENTATION_TOLERANCE) {
    return { kind: 'castle-card', confidence: 'high' };
  }

  if (landscapeRatio < 1 - ORIENTATION_TOLERANCE) {
    return { kind: 'goshuin', confidence: 'high' };
  }

  return { kind: 'goshuin', confidence: 'low' };
}
