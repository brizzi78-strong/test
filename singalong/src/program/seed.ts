/**
 * Seed the Memory Care Music Program (PROGRAM.md) into a Sing Along store:
 * load the public-domain song kit into a facility's library, and build the
 * four themed session playlists for a resident.
 *
 * As a CLI:
 *
 *   SINGALONG_DB=/path/data.db npm run seed:program            # new facility
 *   SINGALONG_DB=... npm run seed:program -- --facility fac_…  # existing one
 *   SINGALONG_DB=... npm run seed:program -- --demo-resident   # + example resident with the 4 playlists
 *
 * Without SINGALONG_DB it seeds an in-memory store and exits — useful only as
 * a dry run, and it says so. Seeding songs is idempotent by title: rerunning
 * against the same facility adds nothing.
 */

import { SingAlongService } from '../service/singalongService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import type { Playlist, Resident, Song } from '../domain/types.ts';
import { CLOSING_SONG, GATHERING_SONG, SESSION_PLANS, SONG_KIT } from './songkit.ts';

/**
 * Load the song kit into the facility's library. Songs whose title is
 * already present are left untouched, so this is safe to rerun.
 */
export function seedSongKit(service: SingAlongService, facilityId: string): { added: Song[]; skipped: number } {
  const existing = new Set(service.listSongs({ facilityId }).map((s) => s.title));
  const added: Song[] = [];
  for (const kitSong of SONG_KIT) {
    if (existing.has(kitSong.title)) continue;
    added.push(
      service.addSong({
        facilityId,
        title: kitSong.title,
        artist: kitSong.artist,
        era: kitSong.era,
        tags: kitSong.tags,
        lyrics: kitSong.lyrics,
        source: 'public_domain',
      }),
    );
  }
  return { added, skipped: SONG_KIT.length - added.length };
}

/**
 * Build the four-week program for one resident: a playlist per session plan,
 * each shaped gathering → core → movement → closing. The kit must already be
 * seeded into the resident's facility (any kit title missing from the
 * library is an error, not a silent gap).
 */
export function createProgramPlaylists(service: SingAlongService, residentId: string): Playlist[] {
  const resident = service.getResident(residentId);
  const byTitle = new Map(service.listSongs({ facilityId: resident.facilityId }).map((s) => [s.title, s.id]));
  const songId = (title: string): string => {
    const id = byTitle.get(title);
    if (!id) throw new Error(`song kit not seeded for this facility: missing "${title}" — run seedSongKit first`);
    return id;
  };
  return SESSION_PLANS.map((plan) =>
    service.createPlaylist({
      facilityId: resident.facilityId,
      residentId: resident.id,
      name: plan.name,
      songIds: [songId(GATHERING_SONG), ...plan.coreTitles.map(songId), songId(plan.movementTitle), songId(CLOSING_SONG)],
    }),
  );
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main(): void {
  const argv = process.argv.slice(2);
  const dbPath = process.env.SINGALONG_DB;
  const store = dbPath ? createSqliteStore(dbPath) : createInMemoryStore();
  const service = new SingAlongService({ store });

  const facilityId = argValue(argv, '--facility');
  let facility;
  if (facilityId) {
    facility = store.facilities.get(facilityId);
    if (!facility) {
      console.error(`No facility ${facilityId} in this store.`);
      process.exitCode = 1;
      return;
    }
  } else {
    facility = service.createFacility({ name: argValue(argv, '--name') ?? 'Memory Care Music Program' });
  }

  const { added, skipped } = seedSongKit(service, facility.id);
  console.log(`Facility ${facility.id} ("${facility.name}"): added ${added.length} songs, ${skipped} already present.`);

  if (argv.includes('--demo-resident')) {
    const resident: Resident = service.createResident({
      facilityId: facility.id,
      name: 'Demo Resident',
      preferredEras: ['1940s', '1950s'],
      preferredGenres: ['big band', 'hymns'],
      notes: 'Example profile created by seed:program — replace with real residents.',
    });
    const playlists = createProgramPlaylists(service, resident.id);
    console.log(`Demo resident ${resident.id} with ${playlists.length} program playlists:`);
    for (const p of playlists) console.log(`  ${p.id}  ${p.name} (${p.songIds.length} songs)`);
  }

  if (!dbPath) {
    console.log('\nNOTE: SINGALONG_DB is not set — this was a dry run against an in-memory store and nothing was saved.');
    console.log('Set SINGALONG_DB=/path/to/data.db (the same file the server uses) to seed for real.');
  }
}

// Run main() only when executed directly, not when imported by tests.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
