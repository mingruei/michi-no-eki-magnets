import type {
  CastleDrivingContent,
  CastlePublicTransitContent,
  NavigationPoint,
} from './navigation';

export type CastleContentFields = {
  locationLabel: string;
  description: string;
  subtitle?: string | null;
  stampLocations: NavigationPoint[];
  driving: CastleDrivingContent;
  publicTransit: CastlePublicTransitContent;
};
