export type CastleSeries = 'original' | 'continued';

export type Castle = {
  id: number;
  number: number;
  name: string;
  nameEn?: string | null;
  series: CastleSeries;
  seriesLabel: string;
  prefecture: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  shortDescription?: string | null;
  stampLocation?: string | null;
  stampLatitude?: number | null;
  stampLongitude?: number | null;
  parkingLatitude?: number | null;
  parkingLongitude?: number | null;
  massTransport?: string | null;
  website?: string | null;
  history?: string | null;
  access?: string | null;
};

export type SeriesFilter = 'all' | CastleSeries;
