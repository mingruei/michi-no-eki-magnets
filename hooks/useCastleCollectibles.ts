import { useCallback, useEffect, useState } from 'react';

import {
  COLLECTIBLE_PROGRESS_FIELD,
  type CastleCollectible,
  type CollectibleKind,
} from '../types/castleCollectible';
import {
  deleteCastleCollectible,
  listCastleCollectibles,
  saveCastleCollectibleFromUri,
} from '../utils/castleCollectibleStorage';
import { persistUploadImage } from '../utils/persistUploadImage';
import {
  pickCollectibleBySource,
  type CollectibleUploadSource,
} from '../utils/castleCollectibleUpload';
import { useCastleProgress } from './useCastleProgress';

type UseCastleCollectiblesResult = {
  items: CastleCollectible[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  refresh: () => void;
  uploadFromSource: (source: CollectibleUploadSource) => Promise<void>;
  removeItem: (item: CastleCollectible) => void;
};

export function useCastleCollectibles(
  castleId: number,
  kind: CollectibleKind,
): UseCastleCollectiblesResult {
  const { getProgress, markProgressCollected } = useCastleProgress();
  const [items, setItems] = useState<CastleCollectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progressField = COLLECTIBLE_PROGRESS_FIELD[kind];

  const ensureCollected = useCallback(() => {
    const progress = getProgress(castleId);
    if (!progress[progressField]) {
      markProgressCollected(castleId, progressField);
    }
  }, [castleId, getProgress, markProgressCollected, progressField]);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const nextItems = listCastleCollectibles(castleId, kind);
      setItems(nextItems);
      if (nextItems.length > 0) {
        ensureCollected();
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'collectible-load-failed');
    } finally {
      setLoading(false);
    }
  }, [castleId, ensureCollected, kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFromSource = useCallback(
    async (source: CollectibleUploadSource) => {
      setUploading(true);
      setError(null);

      try {
        const selections = await pickCollectibleBySource(source);
        if (selections.length === 0) {
          return;
        }

        const existingCount = listCastleCollectibles(castleId, kind).length;

        for (const selection of selections) {
          const persistedUri = await persistUploadImage(
            selection.uri,
            selection.mimeType ?? 'image/jpeg',
            { base64Data: selection.base64 },
          );
          await saveCastleCollectibleFromUri(
            castleId,
            kind,
            persistedUri,
            selection.mimeType,
            { base64Data: selection.base64 },
          );
        }

        const savedItems = listCastleCollectibles(castleId, kind);
        if (savedItems.length <= existingCount) {
          throw new Error('collectible-upload-failed');
        }

        markProgressCollected(castleId, progressField);
        refresh();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('collectible-upload-failed');
        }
      } finally {
        setUploading(false);
      }
    },
    [castleId, kind, markProgressCollected, progressField, refresh],
  );

  const removeItem = useCallback(
    (item: CastleCollectible) => {
      deleteCastleCollectible(item);
      refresh();
    },
    [refresh],
  );

  return {
    items,
    loading,
    uploading,
    error,
    refresh,
    uploadFromSource,
    removeItem,
  };
}
