/** HTTP server: JSON API under /api/*, the single-page rider app everywhere else. */

import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RideService } from '../service/rideService.ts';
import { handleApi } from './router.ts';

const INDEX_HTML_PATH = fileURLToPath(new URL('../web/index.html', import.meta.url));

export interface App {
  server: Server;
  service: RideService;
  stopSimulation: () => void;
}

/** Simulated seconds of driving applied per real second (demo runs faster than life). */
const SIM_SPEEDUP = 12;
const TICK_MS = 1000;

export function createApp(service = new RideService()): App {
  const indexHtml = readFileSync(INDEX_HTML_PATH);

  const server = createServer(async (req, res) => {
    if (await handleApi(req, res, service)) return;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
  });

  const timer = setInterval(() => service.tick(SIM_SPEEDUP * (TICK_MS / 1000)), TICK_MS);
  timer.unref();

  return { server, service, stopSimulation: () => clearInterval(timer) };
}
