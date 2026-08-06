/** JSON API routing for FairFare. No framework — Node's http module is plenty. */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LatLng, VehicleTier } from '../domain/types.ts';
import { CITY_CENTER, CITY_SPAN } from '../store/store.ts';
import { SURGE_CAP, TAKE_RATE, TIER_RATES } from '../domain/pricing.ts';
import { ApiError, RideService } from '../service/rideService.ts';

const TIERS = new Set<VehicleTier>(['standard', 'green', 'xl']);

function parseLatLng(value: unknown, field: string): LatLng {
  const v = value as { lat?: unknown; lng?: unknown } | undefined;
  const lat = Number(v?.lat);
  const lng = Number(v?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ApiError(400, `${field} must be { lat, lng } with valid coordinates`);
  }
  return { lat, lng };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  service: RideService,
): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';
  if (!path.startsWith('/api/')) return false;

  try {
    if (method === 'GET' && path === '/api/health') {
      send(res, 200, { ok: true, service: 'fairfare' });
      return true;
    }

    if (method === 'GET' && path === '/api/config') {
      send(res, 200, {
        city: { center: CITY_CENTER, span: CITY_SPAN },
        takeRate: TAKE_RATE,
        surgeCap: SURGE_CAP,
        tiers: TIER_RATES,
      });
      return true;
    }

    if (method === 'GET' && path === '/api/drivers') {
      send(res, 200, {
        drivers: [...service.store.drivers.values()].map((d) => ({
          id: d.id,
          name: d.name,
          vehicle: d.vehicle,
          tier: d.tier,
          rating: d.rating,
          status: d.status,
          location: d.location,
        })),
      });
      return true;
    }

    if (method === 'GET' && path === '/api/stats') {
      send(res, 200, service.stats());
      return true;
    }

    if (method === 'POST' && path === '/api/quotes') {
      const body = await readJson(req);
      const tier = String(body.tier ?? 'standard') as VehicleTier;
      if (!TIERS.has(tier)) throw new ApiError(400, `tier must be one of: ${[...TIERS].join(', ')}`);
      const pickup = parseLatLng(body.pickup, 'pickup');
      const dropoff = parseLatLng(body.dropoff, 'dropoff');
      send(res, 201, service.quote(pickup, dropoff, tier));
      return true;
    }

    if (method === 'POST' && path === '/api/trips') {
      const body = await readJson(req);
      const quoteId = String(body.quoteId ?? '');
      const riderName = String(body.riderName ?? '').trim() || 'Rider';
      send(res, 201, service.requestRide(quoteId, riderName));
      return true;
    }

    const tripMatch = path.match(/^\/api\/trips\/([\w-]+)(?:\/(cancel|rate))?$/);
    if (tripMatch) {
      const [, tripId = '', action] = tripMatch;
      if (method === 'GET' && !action) {
        send(res, 200, service.getTrip(tripId));
        return true;
      }
      if (method === 'POST' && action === 'cancel') {
        send(res, 200, service.cancel(tripId));
        return true;
      }
      if (method === 'POST' && action === 'rate') {
        const body = await readJson(req);
        send(res, 200, service.rate(tripId, Number(body.stars), Number(body.tip ?? 0)));
        return true;
      }
    }

    throw new ApiError(404, `No such endpoint: ${method} ${path}`);
  } catch (err) {
    if (err instanceof ApiError) {
      send(res, err.status, { error: err.message });
    } else {
      send(res, 500, { error: 'Internal error' });
      // eslint-disable-next-line no-console
      console.error(err);
    }
    return true;
  }
}
