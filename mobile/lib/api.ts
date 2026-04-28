import { supabase } from './supabase';
import type { StationLatestRow } from '../types/station';

export async function fetchStationsNear(
  latitude: number,
  longitude: number,
  takeN = 50
): Promise<{ data: StationLatestRow[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('fetch_stations_near', {
    p_latitude: latitude,
    p_longitude: longitude,
    take_n: takeN,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: (data ?? []) as StationLatestRow[], error: null };
}

export async function insertPrice(
  stationId: string,
  userId: string,
  price: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('prices').insert({
    station_id: stationId,
    user_id: userId,
    price,
  });
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function upsertVote(
  priceId: string,
  userId: string,
  voteType: 'confirm' | 'dispute'
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('votes').upsert(
    { price_id: priceId, user_id: userId, vote_type: voteType },
    { onConflict: 'price_id,user_id' }
  );
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
