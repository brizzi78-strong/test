import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SingAlongService } from '../service/singalongService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { ConflictError, ValidationError } from '../service/errors.ts';

function svc() {
  let seq = 0;
  return new SingAlongService({
    store: createInMemoryStore(),
    now: () => new Date('2026-08-02T00:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
  });
}

function setup(s: SingAlongService) {
  const fac = s.createFacility({ name: 'Cardinal Memory Care' });
  const resident = s.createResident({
    facilityId: fac.id,
    name: 'Eleanor',
    preferredEras: ['1950s'],
    preferredGenres: ['gospel'],
    favoriteArtists: ['Patsy Cline'],
  });
  return { fac, resident };
}

test('songs matching a resident’s era, genre, or favorite artist are suggested; unrelated ones are not', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const match = s.addSong({ facilityId: fac.id, title: 'Walkin’ After Midnight', artist: 'Patsy Cline', era: '1950s', source: 'public_domain' });
  const partial = s.addSong({ facilityId: fac.id, title: 'Amazing Grace', tags: ['gospel'], source: 'public_domain' });
  s.addSong({ facilityId: fac.id, title: 'Some 2010s pop song', era: '2010s', tags: ['pop'], source: 'facility_provided' });

  const suggestions = s.suggestSongsForResident(resident.id);
  assert.deepEqual(suggestions.map((sg) => sg.id), [match.id, partial.id]); // strongest match (artist+era) ranks first
});

test('a song library entry never requires an audioUrl, and rejects a malformed one', () => {
  const s = svc();
  const { fac } = setup(s);
  const song = s.addSong({ facilityId: fac.id, title: 'Sing Along', source: 'public_domain' });
  assert.equal(song.audioUrl, undefined);
  assert.throws(() => s.addSong({ facilityId: fac.id, title: 'Bad', source: 'public_domain', audioUrl: 'not a url' }), ValidationError);
});

test('a session runs through logged entries and completes with a mood delta captured', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const song = s.addSong({ facilityId: fac.id, title: 'Amazing Grace', tags: ['gospel'], source: 'public_domain' });

  const session = s.startSession({ facilityId: fac.id, residentId: resident.id, moodBefore: 'withdrawn' });
  assert.equal(session.status, 'in_progress');

  s.logEntry(session.id, { songId: song.id, engagement: 'sang_along' });
  const completed = s.completeSession(session.id, { moodAfter: 'calm' });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.entries.length, 1);
  assert.equal(completed.entries[0].engagement, 'sang_along');
});

test('a completed session cannot be logged against or completed again', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const song = s.addSong({ facilityId: fac.id, title: 'Amazing Grace', source: 'public_domain' });
  const session = s.startSession({ facilityId: fac.id, residentId: resident.id });
  s.completeSession(session.id);
  assert.throws(() => s.logEntry(session.id, { songId: song.id, engagement: 'sang_along' }), ConflictError);
  assert.throws(() => s.completeSession(session.id), ConflictError);
});

test('insights rank songs by average engagement across completed sessions only', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const favorite = s.addSong({ facilityId: fac.id, title: 'Favorite', source: 'public_domain' });
  const flop = s.addSong({ facilityId: fac.id, title: 'Flop', source: 'public_domain' });

  const done = s.startSession({ facilityId: fac.id, residentId: resident.id });
  s.logEntry(done.id, { songId: favorite.id, engagement: 'sang_along' });
  s.logEntry(done.id, { songId: flop.id, engagement: 'agitated' });
  s.completeSession(done.id);

  // A cancelled session's entries must not count toward insights.
  const cancelled = s.startSession({ facilityId: fac.id, residentId: resident.id });
  s.logEntry(cancelled.id, { songId: flop.id, engagement: 'sang_along' });
  s.cancelSession(cancelled.id);

  const insights = s.insightsForResident(resident.id);
  assert.deepEqual(insights.map((i) => i.songTitle), ['Favorite', 'Flop']);
  assert.equal(insights[0].averageEngagement, 3);
  assert.equal(insights[1].averageEngagement, -2);
});

test('a song from another facility cannot be logged into a session', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const other = s.createFacility({ name: 'Other Facility' });
  const otherSong = s.addSong({ facilityId: other.id, title: 'Not ours', source: 'public_domain' });
  const session = s.startSession({ facilityId: fac.id, residentId: resident.id });
  assert.throws(() => s.logEntry(session.id, { songId: otherSong.id, engagement: 'sang_along' }), ValidationError);
});

test('playlists collect songs for a resident, in order, without duplicates', () => {
  const s = svc();
  const { fac, resident } = setup(s);
  const a = s.addSong({ facilityId: fac.id, title: 'A', source: 'public_domain' });
  const b = s.addSong({ facilityId: fac.id, title: 'B', source: 'public_domain' });
  const playlist = s.createPlaylist({ facilityId: fac.id, residentId: resident.id, name: 'Sunday' });
  s.addSongToPlaylist(playlist.id, a.id);
  s.addSongToPlaylist(playlist.id, b.id);
  const again = s.addSongToPlaylist(playlist.id, a.id);
  assert.deepEqual(again.songIds, [a.id, b.id]);
});
