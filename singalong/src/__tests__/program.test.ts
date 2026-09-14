import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SingAlongService } from '../service/singalongService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createProgramPlaylists, seedSongKit } from '../program/seed.ts';
import { CLOSING_SONG, GATHERING_SONG, SESSION_PLANS, SONG_KIT, currentPlanIndex } from '../program/songkit.ts';

function freshService(): { service: SingAlongService; facilityId: string } {
  const service = new SingAlongService({ store: createInMemoryStore() });
  const facility = service.createFacility({ name: 'Test Facility' });
  return { service, facilityId: facility.id };
}

describe('song kit integrity', () => {
  it('is exactly 22 songs, each publishable: pre-1931, credited, tagged, with lyrics', () => {
    // The exact count is claimed in README.md, PROGRAM.md, and the demo page.
    assert.equal(SONG_KIT.length, 22);
    const titles = new Set<string>();
    for (const song of SONG_KIT) {
      assert.ok(song.title.trim(), 'song must have a title');
      assert.ok(!titles.has(song.title), `duplicate title: ${song.title}`);
      titles.add(song.title);
      assert.ok(song.lyrics.trim().length > 0, `${song.title}: lyrics required for the prompter`);
      assert.ok(song.artist.trim(), `${song.title}: attribution required`);
      assert.ok(song.era.trim(), `${song.title}: era required`);
      assert.ok(song.published < 1931, `${song.title}: published ${song.published} breaks the pre-1931 PD rule`);
      assert.ok(song.tags.length > 0, `${song.title}: at least one tag`);
    }
  });

  it('the anchor songs exist in the kit', () => {
    const titles = new Set(SONG_KIT.map((s) => s.title));
    assert.ok(titles.has(GATHERING_SONG));
    assert.ok(titles.has(CLOSING_SONG));
  });

  it('every session plan references only kit songs and follows the arc', () => {
    const titles = new Set(SONG_KIT.map((s) => s.title));
    assert.equal(SESSION_PLANS.length, 4, 'four-week rotating cycle');
    for (const plan of SESSION_PLANS) {
      assert.ok(plan.coreTitles.length >= 3, `${plan.key}: needs a core of familiar songs`);
      for (const title of [...plan.coreTitles, plan.movementTitle]) {
        assert.ok(titles.has(title), `${plan.key} references unknown song: ${title}`);
      }
      assert.ok(!plan.coreTitles.includes(GATHERING_SONG) && !plan.coreTitles.includes(CLOSING_SONG),
        `${plan.key}: anchors are added by the seeder, not listed as core`);
    }
  });

  it('carries no minstrel-artifact titles the cultural review replaced', () => {
    const titles = new Set(SONG_KIT.map((s) => s.title));
    for (const banned of ['Camptown Races', 'Oh! Susanna', 'Good Night, Ladies']) {
      assert.ok(!titles.has(banned), `${banned} was replaced and must not return`);
    }
  });

  it('currentPlanIndex always lands on a real plan', () => {
    for (const iso of ['2026-01-01', '2026-06-15', '2026-12-31', '2027-03-03']) {
      const i = currentPlanIndex(new Date(iso));
      assert.ok(i >= 0 && i < SESSION_PLANS.length, `${iso} → ${i}`);
    }
  });
});

describe('seedSongKit', () => {
  it('loads the whole kit as public-domain songs with every field intact', () => {
    const { service, facilityId } = freshService();
    const { added, skipped, conflicting } = seedSongKit(service, facilityId);
    assert.equal(added.length, SONG_KIT.length);
    assert.equal(skipped, 0);
    assert.deepEqual(conflicting, []);
    const byTitle = new Map(service.listSongs({ facilityId }).map((s) => [s.title, s]));
    for (const kit of SONG_KIT) {
      const song = byTitle.get(kit.title);
      assert.ok(song, kit.title);
      assert.equal(song.source, 'public_domain');
      assert.equal(song.lyrics, kit.lyrics);
      assert.equal(song.artist, kit.artist);
      assert.equal(song.era, kit.era);
      assert.deepEqual(song.tags, kit.tags);
    }
  });

  it('is idempotent by title', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    const second = seedSongKit(service, facilityId);
    assert.equal(second.added.length, 0);
    assert.equal(second.skipped, SONG_KIT.length);
    assert.equal(service.listSongs({ facilityId }).length, SONG_KIT.length);
  });

  it('reports a lyric-less same-titled facility song as conflicting, not merely skipped', () => {
    const { service, facilityId } = freshService();
    service.addSong({ facilityId, title: 'Amazing Grace', artist: 'House recording', source: 'facility_provided' });
    const { added, conflicting } = seedSongKit(service, facilityId);
    assert.equal(added.length, SONG_KIT.length - 1);
    assert.deepEqual(conflicting, ['Amazing Grace']);
  });

  it('keeps facilities isolated', () => {
    const { service, facilityId } = freshService();
    const other = service.createFacility({ name: 'Other Facility' });
    seedSongKit(service, facilityId);
    assert.equal(service.listSongs({ facilityId: other.id }).length, 0);
    const second = seedSongKit(service, other.id);
    assert.equal(second.added.length, SONG_KIT.length);
  });
});

describe('createProgramPlaylists', () => {
  it('builds one playlist per session plan, shaped gathering → core → movement → closing', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    const resident = service.createResident({ facilityId, name: 'Alice' });
    const { created, skipped } = createProgramPlaylists(service, resident.id);

    assert.equal(created.length, SESSION_PLANS.length);
    assert.deepEqual(skipped, []);
    const songTitle = (id: string) => service.getSong(id).title;
    created.forEach((playlist, i) => {
      const plan = SESSION_PLANS[i];
      assert.equal(playlist.name, plan.name);
      assert.equal(playlist.residentId, resident.id);
      const titles = playlist.songIds.map(songTitle);
      assert.equal(titles[0], GATHERING_SONG, 'opens with the gathering anchor');
      assert.equal(titles[titles.length - 1], CLOSING_SONG, 'ends with the closing ritual');
      assert.deepEqual(titles.slice(1, 1 + plan.coreTitles.length), plan.coreTitles);
      assert.equal(titles[titles.length - 2], plan.movementTitle, 'movement song before the close');
    });
  });

  it('is idempotent by playlist name — a rerun creates nothing new', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    const resident = service.createResident({ facilityId, name: 'Alice' });
    createProgramPlaylists(service, resident.id);
    const second = createProgramPlaylists(service, resident.id);
    assert.equal(second.created.length, 0);
    assert.equal(second.skipped.length, SESSION_PLANS.length);
    assert.equal(service.listPlaylists({ residentId: resident.id }).length, SESSION_PLANS.length);
  });

  it('fails atomically when the kit is missing — no partial playlists, all missing titles named', () => {
    const { service, facilityId } = freshService();
    const resident = service.createResident({ facilityId, name: 'Bob' });
    assert.throws(() => createProgramPlaylists(service, resident.id), (err: Error) => {
      assert.match(err.message, /song kit not seeded/);
      assert.match(err.message, new RegExp(GATHERING_SONG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      return true;
    });
    assert.equal(service.listPlaylists({ residentId: resident.id }).length, 0, 'nothing persisted on failure');
  });

  it('prefers the public-domain kit song when a duplicate title is added after seeding', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    service.addSong({ facilityId, title: 'Amazing Grace', artist: 'House recording', source: 'facility_provided' });
    const resident = service.createResident({ facilityId, name: 'Cara' });
    const { created } = createProgramPlaylists(service, resident.id);
    const week4 = created.find((p) => p.name.includes('Comfort'));
    assert.ok(week4);
    const graceId = week4.songIds.find((id) => service.getSong(id).title === 'Amazing Grace');
    assert.ok(graceId);
    assert.equal(service.getSong(graceId).source, 'public_domain', 'the lyric-bearing kit entry wins');
  });

  it('suggestions are non-empty for the demo resident profile the seeder creates', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    const resident = service.createResident({
      facilityId,
      name: 'Demo Resident',
      preferredEras: ['1910s', '1900s'],
      preferredGenres: ['gentle', 'hymn', 'waltz'],
    });
    const suggested = service.suggestSongsForResident(resident.id);
    assert.ok(suggested.length > 0, 'the personalization feature must demonstrate itself in seeded data');
  });
});
