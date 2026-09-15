/**
 * The aggregator core: SquareFare compares every way to get there — Uber,
 * Lyft, the local taxi fleet, and SquareFare's own driver network — and
 * ranks them by what the rider will actually pay.
 *
 * Uber and Lyft closed their public pricing APIs, so external offers are
 * estimated from published per-city rate cards (the same approach RideGuru
 * and Obi use) and clearly labelled as estimates. Booking an external offer
 * deep-links into that provider's app with pickup/dropoff pre-filled.
 * SquareFare-network offers are exact, locked-in quotes bookable in-app.
 */

import type { LatLng } from './types.ts';
import { distanceKm, travelMinutes } from './geo.ts';
import { roundMoney } from './pricing.ts';

export type OfferKind = 'exact' | 'estimate';

export interface ProviderOffer {
  provider: string;
  product: string;
  kind: OfferKind;
  /** Estimated or exact rider price in dollars. */
  total: number;
  etaMinutes: number;
  seats: number;
  /** Deep link that opens this ride pre-filled in the provider's app (external offers only). */
  bookingLink?: string;
  /** SquareFare-network offers only: quote to pass to POST /api/trips to book in-app. */
  quoteId?: string;
  /** SquareFare-network offers only: the itemized fare lines behind the exact price. */
  lines?: { label: string; amount: number }[];
  note: string;
}

interface RateCard {
  provider: string;
  product: string;
  seats: number;
  base: number;
  perKm: number;
  perMin: number;
  bookingFee: number;
  minimumFare: number;
  /** Typical pickup wait for this provider in a dense city, minutes. */
  typicalEtaMin: number;
  note: string;
}

/**
 * Sample big-city rate cards (metro published rates, 2026). Estimates only —
 * real totals vary with each provider's live surge, which none of them cap.
 */
export const EXTERNAL_RATE_CARDS: RateCard[] = [
  {
    provider: 'Uber', product: 'UberX', seats: 4,
    base: 2.55, perKm: 1.09, perMin: 0.35, bookingFee: 2.75, minimumFare: 8.5,
    typicalEtaMin: 4,
    note: 'Estimate from published city rates; live surge is uncapped and undisclosed.',
  },
  {
    provider: 'Uber', product: 'UberXL', seats: 6,
    base: 3.85, perKm: 1.68, perMin: 0.5, bookingFee: 2.75, minimumFare: 11.5,
    typicalEtaMin: 6,
    note: 'Estimate from published city rates; live surge is uncapped and undisclosed.',
  },
  {
    provider: 'Lyft', product: 'Lyft', seats: 4,
    base: 2.49, perKm: 1.06, perMin: 0.37, bookingFee: 2.95, minimumFare: 8.4,
    typicalEtaMin: 4,
    note: 'Estimate from published city rates; Prime Time pricing is uncapped.',
  },
  {
    provider: 'Lyft', product: 'Lyft XL', seats: 6,
    base: 3.7, perKm: 1.62, perMin: 0.53, bookingFee: 2.95, minimumFare: 11.2,
    typicalEtaMin: 7,
    note: 'Estimate from published city rates; Prime Time pricing is uncapped.',
  },
  {
    provider: 'City Taxi', product: 'Metered cab', seats: 4,
    base: 3.0, perKm: 1.74, perMin: 0.0, bookingFee: 0, minimumFare: 3.0,
    typicalEtaMin: 9,
    note: 'Standard meter rate; no surge ever, hail or call dispatch.',
  },
];

function uberDeepLink(pickup: LatLng, dropoff: LatLng): string {
  const q = new URLSearchParams({
    action: 'setPickup',
    'pickup[latitude]': String(pickup.lat),
    'pickup[longitude]': String(pickup.lng),
    'dropoff[latitude]': String(dropoff.lat),
    'dropoff[longitude]': String(dropoff.lng),
  });
  return `https://m.uber.com/ul/?${q}`;
}

function lyftDeepLink(pickup: LatLng, dropoff: LatLng): string {
  const q = new URLSearchParams({
    id: 'lyft',
    'pickup[latitude]': String(pickup.lat),
    'pickup[longitude]': String(pickup.lng),
    'destination[latitude]': String(dropoff.lat),
    'destination[longitude]': String(dropoff.lng),
  });
  return `https://ride.lyft.com/ridetype?${q}`;
}

function bookingLink(provider: string, pickup: LatLng, dropoff: LatLng): string | undefined {
  if (provider === 'Uber') return uberDeepLink(pickup, dropoff);
  if (provider === 'Lyft') return lyftDeepLink(pickup, dropoff);
  return undefined; // taxis: dispatch phone/hail, no universal deep link
}

/** Price every external provider for this trip from its rate card. */
export function externalOffers(pickup: LatLng, dropoff: LatLng): ProviderOffer[] {
  const km = distanceKm(pickup, dropoff);
  const min = travelMinutes(pickup, dropoff);

  return EXTERNAL_RATE_CARDS.map((r) => {
    const metered = r.base + r.perKm * km + r.perMin * min;
    const total = roundMoney(Math.max(r.minimumFare, metered) + r.bookingFee);
    return {
      provider: r.provider,
      product: r.product,
      kind: 'estimate' as const,
      total,
      etaMinutes: r.typicalEtaMin,
      seats: r.seats,
      bookingLink: bookingLink(r.provider, pickup, dropoff),
      note: r.note,
    };
  });
}

/** Rank offers the way a rider shops: cheapest first, faster pickup breaking ties. */
export function rankOffers(offers: ProviderOffer[]): ProviderOffer[] {
  return [...offers].sort((a, b) => a.total - b.total || a.etaMinutes - b.etaMinutes);
}
