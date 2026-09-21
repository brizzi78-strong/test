/**
 * In-memory store seeded with a demo fleet around Meridian City (a
 * Manhattan-sized grid centred on 40.75, -73.99). Deterministic seeding keeps
 * demos and tests reproducible.
 */

import type { Driver, Quote, Trip, VehicleTier } from '../domain/types.ts';

export const CITY_CENTER = { lat: 40.75, lng: -73.99 };

/** Roughly a 6 km x 6 km box around the city centre. */
export const CITY_SPAN = { lat: 0.027, lng: 0.036 };

interface SeedDriver {
  name: string;
  vehicle: string;
  plate: string;
  tier: VehicleTier;
  rating: number;
  trips: number;
}

const SEED_DRIVERS: SeedDriver[] = [
  { name: 'Ada Okafor', vehicle: 'Toyota Camry', plate: '4KX-118', tier: 'standard', rating: 4.9, trips: 3120 },
  { name: 'Marcus Webb', vehicle: 'Honda Accord', plate: '7TR-402', tier: 'standard', rating: 4.7, trips: 1874 },
  { name: 'Priya Raman', vehicle: 'Hyundai Sonata', plate: '2QF-935', tier: 'standard', rating: 4.8, trips: 2419 },
  { name: 'Jonas Lindqvist', vehicle: 'Kia K5', plate: '9GH-260', tier: 'standard', rating: 4.6, trips: 987 },
  { name: 'Rosa Delgado', vehicle: 'Toyota Corolla', plate: '5MN-781', tier: 'standard', rating: 4.9, trips: 4055 },
  { name: 'Sam Whitfield', vehicle: 'Chevy Malibu', plate: '3BC-547', tier: 'standard', rating: 4.5, trips: 611 },
  { name: 'Lena Hoffmann', vehicle: 'Tesla Model 3', plate: '8EV-014', tier: 'green', rating: 4.8, trips: 2203 },
  { name: 'Kofi Mensah', vehicle: 'Hyundai Ioniq 5', plate: '6EV-329', tier: 'green', rating: 4.9, trips: 1546 },
  { name: 'Yuki Tanaka', vehicle: 'Polestar 2', plate: '1EV-880', tier: 'green', rating: 4.7, trips: 934 },
  { name: 'Omar Haddad', vehicle: 'Toyota Sienna', plate: '4XL-226', tier: 'xl', rating: 4.8, trips: 2761 },
  { name: 'Grace Njeri', vehicle: 'Honda Odyssey', plate: '7XL-593', tier: 'xl', rating: 4.9, trips: 3308 },
  { name: 'Pavel Novak', vehicle: 'Chrysler Pacifica', plate: '2XL-071', tier: 'xl', rating: 4.6, trips: 1189 },
];

/** Small deterministic PRNG (mulberry32) so the demo fleet spawns identically every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Store {
  readonly drivers = new Map<string, Driver>();
  readonly quotes = new Map<string, Quote>();
  readonly trips = new Map<string, Trip>();

  tripsCompleted = 0;
  riderTotalPaid = 0;
  driverTotalEarned = 0;
  platformTotalFees = 0;

  private nextId = 1;

  constructor(seed = 20260806) {
    const rand = mulberry32(seed);
    for (const s of SEED_DRIVERS) {
      const id = this.newId('drv');
      this.drivers.set(id, {
        id,
        name: s.name,
        vehicle: s.vehicle,
        plate: s.plate,
        tier: s.tier,
        rating: s.rating,
        tripsCompleted: s.trips,
        status: 'available',
        location: {
          lat: CITY_CENTER.lat + (rand() - 0.5) * 2 * CITY_SPAN.lat,
          lng: CITY_CENTER.lng + (rand() - 0.5) * 2 * CITY_SPAN.lng,
        },
        earnings: 0,
      });
    }
  }

  newId(prefix: string): string {
    return `${prefix}_${(this.nextId++).toString(36).padStart(4, '0')}`;
  }

  availableDrivers(): Driver[] {
    return [...this.drivers.values()].filter((d) => d.status === 'available');
  }

  activeTrips(): Trip[] {
    return [...this.trips.values()].filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled',
    );
  }
}
