/** Shared domain types for the SquareFare ride-hailing engine. */

export interface LatLng {
  lat: number;
  lng: number;
}

export type VehicleTier = 'standard' | 'xl' | 'green';

export type DriverStatus = 'available' | 'on_trip' | 'offline';

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  tier: VehicleTier;
  rating: number; // 1..5
  tripsCompleted: number;
  status: DriverStatus;
  location: LatLng;
  /** Lifetime earnings paid out to this driver (fares net of platform fee, plus tips). */
  earnings: number;
}

/** One line of an itemized fare quote. Every cent the rider pays appears here. */
export interface FareLine {
  label: string;
  amount: number;
}

export interface Quote {
  id: string;
  tier: VehicleTier;
  pickup: LatLng;
  dropoff: LatLng;
  distanceKm: number;
  durationMin: number;
  /** Demand multiplier actually applied. Never exceeds SURGE_CAP; always disclosed. */
  demandMultiplier: number;
  lines: FareLine[];
  /** What the rider pays (sum of lines). */
  total: number;
  /** What the driver receives from the fare (before any tip). */
  driverEarnings: number;
  /** What the platform keeps. total = driverEarnings + platformFee. */
  platformFee: number;
  expiresAt: number; // epoch ms
}

export type TripStatus =
  | 'matched' // driver assigned, heading to pickup
  | 'arriving' // driver within arrival radius of pickup
  | 'in_progress' // rider on board
  | 'completed'
  | 'cancelled';

export interface Trip {
  id: string;
  quote: Quote;
  riderName: string;
  driverId: string;
  status: TripStatus;
  driverLocation: LatLng;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  cancelledBy?: 'rider' | 'driver';
  /** Cancellation fee charged, if any (0 when cancelled before the driver committed real time). */
  cancellationFee: number;
  tip: number;
  rating?: number;
}

export interface PlatformStats {
  tripsCompleted: number;
  riderTotalPaid: number;
  driverTotalEarned: number;
  platformTotalFees: number;
  /** platformTotalFees / riderTotalPaid — held to TAKE_RATE by construction. */
  effectiveTakeRate: number;
}
