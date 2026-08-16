import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SingAlongService } from '../service/singalongService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createProgramPlaylists, seedSongKit } from '../program/seed.ts';
import { CLOSING_SONG, GATHERING_SONG, SESSION_PLANS, SONG_KIT } from '../program/songkit.ts';

function freshService(): { service: SingAlongService; facilityId: string } {
  const service = new SingAlongService({ store: createInMemoryStore() });
  const facility = service.createFacility({ name: 'Test Facility' });
  return { service, facilityId: facility.id };
}

describe('song kit integrity', () => {
  it('every song has lyrics, an era, and at least one tag, and titles are unique', () => {
    assert.ok(SONG_KIT.length >= 18, `expected a substantial kit, got ${SONG_KIT.length}`);
    const titles = new Set<string>();
    for (const song of SONG_KIT) {
      assert.ok(song.title.trim(), 'song must have a title');
      assert.ok(!titles.has(song.title), `duplicate title: ${song.title}`);
      titles.add(song.title);
      assert.ok(song.lyrics.trim().length > 0, `${song.title}: lyrics required for the prompter`);
      assert.ok(song.era.trim(), `${song.title}: era required`);
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
});

describe('seedSongKit', () => {
  it('loads the whole kit as public-domain songs with lyrics', () => {
    const { service, facilityId } = freshService();
    const { added, skipped } = seedSongKit(service, facilityId);
    assert.equal(added.length, SONG_KIT.length);
    assert.equal(skipped, 0);
    for (const song of service.listSongs({ facilityId })) {
      assert.equal(song.source, 'public_domain');
      assert.ok(song.lyrics && song.lyrics.length > 0);
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
});

describe('createProgramPlaylists', () => {
  it('builds one playlist per session plan, shaped gathering → core → movement → closing', () => {
    const { service, facilityId } = freshService();
    seedSongKit(service, facilityId);
    const resident = service.createResident({ facilityId, name: 'Alice' });
    const playlists = createProgramPlaylists(service, resident.id);

    assert.equal(playlists.length, SESSION_PLANS.length);
    const songTitle = (id: string) => service.getSong(id).title;
    playlists.forEach((playlist, i) => {
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

  it('fails loudly if the kit was not seeded first', () => {
    const { service, facilityId } = freshService();
    const resident = service.createResident({ facilityId, name: 'Bob' });
    assert.throws(() => createProgramPlaylists(service, resident.id), /song kit not seeded/);
  });
});
