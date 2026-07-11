import type { User } from '@supabase/supabase-js';

import type { CastleProgressMap } from '../types/castleProgress';
import {
  mergeProgressMaps,
  normalizeProgressMap,
  serializeProgressMap,
} from './mergeProgressMap';
import { getSupabaseClient } from './supabaseClient';

export type CloudProgressSnapshot = {
  progressMap: CastleProgressMap;
  rowUpdatedAt: number | null;
};

export async function fetchSupabaseProgress(user: User): Promise<CloudProgressSnapshot> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { progressMap: {}, rowUpdatedAt: null };
  }

  const { data, error } = await supabase
    .from('castle_progress')
    .select('progress_map, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const rowUpdatedAt = data?.updated_at ? Date.parse(data.updated_at) : null;
  const fallbackTimestamp = rowUpdatedAt ?? 0;

  return {
    progressMap: normalizeProgressMap(data?.progress_map, fallbackTimestamp),
    rowUpdatedAt,
  };
}

export async function saveSupabaseProgress(
  user: User,
  progressMap: CastleProgressMap,
): Promise<CastleProgressMap> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return progressMap;
  }

  const { progressMap: existing } = await fetchSupabaseProgress(user);
  const merged = mergeProgressMaps(existing, progressMap);

  const { error } = await supabase.from('castle_progress').upsert(
    {
      user_id: user.id,
      progress_map: serializeProgressMap(merged),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw error;
  }

  return merged;
}
