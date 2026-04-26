export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

export type StationLatestRow = {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  latest_price_id: string | null;
  latest_price: string | null;
  created_at: string | null;
  confirmation_count: number;
  dispute_count: number;
  confidence_score: number;
  confidence_level: ConfidenceLabel;
  is_outdated: boolean;
  display_confidence_level: ConfidenceLabel;
};
