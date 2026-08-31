/**
 * Seed the Memory Care Music Program (PROGRAM.md) into a Sing Along store:
 * load the public-domain song kit into a facility's library, and build the
 * four themed session playlists for a resident.
 *
 * As a CLI:
 *
 *   SINGALONG_DB=./data.db npm run seed:program                     # new facility + song kit
 *   SINGALONG_DB=./data.db npm run seed:program -- --facility fac_… # existing facility (idempotent)
 *   SINGALONG_DB=./data.db npm run seed:program -- --facility fac_… --resident res_…
 *                                                                   # the 4 program playlists for a real resident
 *   SINGALONG_DB=./data.db npm run seed:program -- --demo-resident  # example resident + playlists
 *
 * `data.db` is just a file the app creates — pick any writable path and use
 * the SAME path for the server (`SINGALONG_DB=./data.db npm start`).
 * Without SINGALONG_DB this is a dry run against an in-memory store: it
 * says so up front, saves nothing, and exits non-zero so scripts notice.
 *
 * Song seeding is idempotent by title. Playlist seeding is idempotent by
 * playlist name per resident: rerunning skips plans the resident already
 * has. `--demo-resident` reuses an existing "Demo Resident" in the facility
 * rather than minting another.
 */

import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SingAlongService } from '../service/singalongService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import type { Playlist, Resident, Song } from '../domain/types.ts';
import { CLOSING_SONG, GATHERING_SONG, SESSION_PLANS, SONG_KIT } from './songkit.ts';

/**
 * Load the song kit into the facility's library. Songs whose title is
 * already present are left untouched, so this is safe to rerun — but a
 * pre-existing same-titled song may not carry lyrics, so collisions are
 * reported separately from a clean skip.
 */
export function seedSongKit(
  service: SingAlongService,
  facilityId: string,
): { added: Song[]; skipped: number; conflicting: string[] } {
  const existing = new Map(service.listSongs({ facilityId }).map((s) => [s.title, s]));
  const added: Song[] = [];
  const conflicting: string[] = [];
  for (const kitSong of SONG_KIT) {
    const present = existing.get(kitSong.title);
    if (present) {
      if (!present.lyrics || present.lyrics.trim() === '') conflicting.push(kitSong.title);
      continue;
    }
    const song = service.addSong({
      facilityId,
      title: kitSong.title,
      artist: kitSong.artist,
      era: kitSong.era,
      tags: kitSong.tags,
      lyrics: kitSong.lyrics,
      source: 'public_domain',
    });
    added.push(song);
    existing.set(song.title, song);
  }
  return { added, skipped: SONG_KIT.length - added.length, conflicting };
}

/**
 * Build the four-week program for one resident: a playlist per session plan,
 * each shaped gathering → core → movement → closing. All titles are
 * resolved up front so a missing song fails before anything is written, and
 * plans whose playlist name the resident already has are skipped, so this
 * is safe to rerun.
 */
export function createProgramPlaylists(
  service: SingAlongService,
  residentId: string,
): { created: Playlist[]; skipped: string[] } {
  const resident = service.getResident(residentId);
  const byTitle = new Map<string, string>();
  for (const song of service.listSongs({ facilityId: resident.facilityId })) {
    // Prefer the public-domain kit entry when a facility song shares a title.
    if (!byTitle.has(song.title) || song.source === 'public_domain') byTitle.set(song.title, song.id);
  }
  const missing = new Set<string>();
  const resolved = SESSION_PLANS.map((plan) => {
    const titles = [GATHERING_SONG, ...plan.coreTitles, plan.movementTitle, CLOSING_SONG];
    const ids = titles.map((t) => {
      const id = byTitle.get(t);
      if (!id) missing.add(t);
      return id as string;
    });
    return { plan, ids };
  });
  if (missing.size > 0) {
    throw new Error(
      `song kit not seeded for facility ${resident.facilityId}: missing ${[...missing]
        .map((t) => `"${t}"`)
        .join(', ')} — run seedSongKit first`,
    );
  }
  const existingNames = new Set(service.listPlaylists({ residentId: resident.id }).map((p) => p.name));
  const created: Playlist[] = [];
  const skipped: string[] = [];
  for (const { plan, ids } of resolved) {
    if (existingNames.has(plan.name)) {
      skipped.push(plan.name);
      continue;
    }
    created.push(
      service.createPlaylist({ facilityId: resident.facilityId, residentId: resident.id, name: plan.name, songIds: ids }),
    );
  }
  return { created, skipped };
}

function openStore(dbPath: string | undefined): { store: Store; dryRun: boolean } {
  if (!dbPath) return { store: createInMemoryStore(), dryRun: true };
  try {
    return { store: createSqliteStore(dbPath), dryRun: false };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`Could not open the database file at ${dbPath} — does that folder exist and can you write to it?`);
    console.error(`(${detail})`);
    process.exit(1);
  }
}

function main(): void {
  let flags: { facility?: string; resident?: string; name?: string; 'demo-resident'?: boolean };
  try {
    flags = parseArgs({
      args: process.argv.slice(2),
      options: {
        facility: { type: 'string' },
        resident: { type: 'string' },
        name: { type: 'string' },
        'demo-resident': { type: 'boolean' },
      },
    }).values;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error(
      'Usage: seed:program [--facility fac_ID] [--resident res_ID] [--name "Facility name"] [--demo-resident]',
    );
    process.exitCode = 1;
    return;
  }

  const dbPath = process.env.SINGALONG_DB;
  const { store, dryRun } = openStore(dbPath);
  const service = new SingAlongService({ store });

  if (dryRun) {
    console.log('DRY RUN: SINGALONG_DB is not set, so this uses a throwaway in-memory store.');
    console.log('Nothing below is saved. Set SINGALONG_DB=./data.db (the same file the server uses) to seed for real.\n');
  }

  let facility;
  if (flags.facility !== undefined) {
    facility = store.facilities.get(flags.facility);
    if (!facility) {
      console.error(
        flags.facility === ''
          ? '--facility needs a value (the fac_… ID printed when the facility was seeded).'
          : `No facility ${flags.facility} in this store. Facility IDs are printed when seeding; check the value.`,
      );
      process.exitCode = 1;
      return;
    }
  } else {
    facility = service.createFacility({ name: flags.name ?? 'Memory Care Music Program' });
  }

  const { added, skipped, conflicting } = seedSongKit(service, facility.id);
  console.log(`Facility ${facility.id} ("${facility.name}"): added ${added.length} songs, ${skipped} already present.`);
  if (conflicting.length > 0) {
    console.log(
      `WARNING: ${conflicting.length} existing song(s) share a kit title but have no lyrics, so the prompter will show none for: ${conflicting.join(', ')}.`,
    );
  }

  const buildFor = (resident: Resident) => {
    const { created, skipped: existing } = createProgramPlaylists(service, resident.id);
    console.log(`Resident ${resident.id} ("${resident.name}"): ${created.length} program playlists created` +
      (existing.length > 0 ? `, ${existing.length} already present.` : '.'));
    for (const p of created) console.log(`  ${p.id}  ${p.name} (${p.songIds.length} songs)`);
  };

  if (flags.resident !== undefined) {
    if (flags.resident === '') {
      console.error('--resident needs a value (the res_… ID from the console or API).');
      process.exitCode = 1;
      return;
    }
    buildFor(service.getResident(flags.resident));
  }

  if (flags['demo-resident']) {
    const demo = service
      .listResidents({ facilityId: facility.id })
      .find((r) => r.name === 'Demo Resident');
    const resident =
      demo ??
      service.createResident({
        facilityId: facility.id,
        name: 'Demo Resident',
        // Preferences deliberately overlap the kit (eras + tags) so the
        // suggestions endpoint demonstrates ranking instead of returning [].
        preferredEras: ['1910s', '1900s'],
        preferredGenres: ['gentle', 'hymn', 'waltz'],
        notes: 'Example profile created by seed:program — replace with real residents.',
      });
    buildFor(resident);
  }

  if (dryRun) process.exitCode = 2;
}

// Run main() only when executed directly, not when imported by tests.
// realpath + pathToFileURL survive symlinked checkouts and special chars.
const invokedDirectly = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(argv1)).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
