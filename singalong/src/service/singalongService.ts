/**
 * SingAlongService — facilities, resident musical profiles, a song library,
 * playlists, and guided sing-along sessions.
 *
 * The value this adds over a plain music player is entirely in the loop:
 * `suggestSongs` ranks the library against a resident's own musical past,
 * staff run a session and log how each song landed, and `topSongsForResident`
 * turns that history into "these are the songs that work" — the next
 * playlist gets better because the last one was logged.
 */

import { randomUUID } from 'node:crypto';
import type {
  EngagementLevel,
  Facility,
  MoodRating,
  Playlist,
  Resident,
  Song,
  SongSource,
  SingSession,
} from '../domain/types.ts';
import { ENGAGEMENT_LEVELS, MOOD_RATINGS, SONG_SOURCES } from '../domain/types.ts';
import { canTransition, suggestSongs, topSongsForResident, type SongInsight } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export class SingAlongService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((p) => `${p}_${randomUUID()}`);
  }

  // --- facilities ----------------------------------------------------------

  createFacility(input: { name: string }): Facility {
    const facility: Facility = { id: this.newId('fac'), name: requireString(input.name, 'name'), createdAt: this.ts() };
    this.store.facilities.put(facility);
    return facility;
  }

  // --- residents -------------------------------------------------------------

  createResident(input: {
    facilityId: string;
    name: string;
    preferredEras?: string[];
    preferredGenres?: string[];
    favoriteArtists?: string[];
    notes?: string;
  }): Resident {
    this.requireFacility(input.facilityId);
    const resident: Resident = {
      id: this.newId('res'),
      facilityId: input.facilityId,
      name: requireString(input.name, 'name'),
      preferredEras: optionalStringArray(input.preferredEras),
      preferredGenres: optionalStringArray(input.preferredGenres),
      favoriteArtists: optionalStringArray(input.favoriteArtists),
      notes: optionalString(input.notes),
      createdAt: this.ts(),
    };
    this.store.residents.put(resident);
    return resident;
  }

  getResident(id: string): Resident {
    return this.require(this.store.residents, 'Resident', id);
  }

  listResidents(filter?: { facilityId?: string }): Resident[] {
    return this.store.residents.list((r) => !filter?.facilityId || r.facilityId === filter.facilityId);
  }

  // --- song library ----------------------------------------------------------

  addSong(input: {
    facilityId: string;
    title: string;
    artist?: string;
    era?: string;
    tags?: string[];
    lyrics?: string;
    audioUrl?: string;
    source: SongSource;
  }): Song {
    this.requireFacility(input.facilityId);
    if (!SONG_SOURCES.includes(input.source)) {
      throw new ValidationError(`source must be one of: ${SONG_SOURCES.join(', ')}`);
    }
    const song: Song = {
      id: this.newId('song'),
      facilityId: input.facilityId,
      title: requireString(input.title, 'title'),
      artist: optionalString(input.artist),
      era: optionalString(input.era),
      tags: optionalStringArray(input.tags) ?? [],
      lyrics: optionalString(input.lyrics),
      audioUrl: input.audioUrl === undefined ? undefined : validateUrl(input.audioUrl),
      source: input.source,
      createdAt: this.ts(),
    };
    this.store.songs.put(song);
    return song;
  }

  getSong(id: string): Song {
    return this.require(this.store.songs, 'Song', id);
  }

  listSongs(filter?: { facilityId?: string }): Song[] {
    return this.store.songs.list((s) => !filter?.facilityId || s.facilityId === filter.facilityId);
  }

  /** Rank the facility's library for a resident by era/genre/artist match. */
  suggestSongsForResident(residentId: string, limit?: number): Song[] {
    const resident = this.getResident(residentId);
    const songs = this.listSongs({ facilityId: resident.facilityId });
    return suggestSongs(resident, songs, limit);
  }

  // --- playlists ---------------------------------------------------------

  createPlaylist(input: { facilityId: string; residentId: string; name: string; songIds?: string[] }): Playlist {
    const facility = this.requireFacility(input.facilityId);
    const resident = this.require(this.store.residents, 'Resident', input.residentId);
    if (resident.facilityId !== facility.id) throw new ValidationError('resident belongs to another facility');
    const songIds = optionalStringArray(input.songIds) ?? [];
    for (const songId of songIds) this.requireSongInFacility(songId, facility.id);
    const playlist: Playlist = {
      id: this.newId('pl'),
      facilityId: facility.id,
      residentId: resident.id,
      name: requireString(input.name, 'name'),
      songIds,
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    this.store.playlists.put(playlist);
    return playlist;
  }

  addSongToPlaylist(id: string, songId: string): Playlist {
    const playlist = this.require(this.store.playlists, 'Playlist', id);
    this.requireSongInFacility(songId, playlist.facilityId);
    if (!playlist.songIds.includes(songId)) playlist.songIds.push(songId);
    playlist.updatedAt = this.ts();
    this.store.playlists.put(playlist);
    return playlist;
  }

  getPlaylist(id: string): Playlist {
    return this.require(this.store.playlists, 'Playlist', id);
  }

  listPlaylists(filter?: { facilityId?: string; residentId?: string }): Playlist[] {
    return this.store.playlists.list(
      (p) =>
        (!filter?.facilityId || p.facilityId === filter.facilityId) &&
        (!filter?.residentId || p.residentId === filter.residentId),
    );
  }

  // --- sessions ------------------------------------------------------------

  startSession(input: { facilityId: string; residentId: string; playlistId?: string; moodBefore?: MoodRating }): SingSession {
    const facility = this.requireFacility(input.facilityId);
    const resident = this.require(this.store.residents, 'Resident', input.residentId);
    if (resident.facilityId !== facility.id) throw new ValidationError('resident belongs to another facility');
    if (input.playlistId) {
      const playlist = this.require(this.store.playlists, 'Playlist', input.playlistId);
      if (playlist.facilityId !== facility.id) throw new ValidationError('playlist belongs to another facility');
    }
    if (input.moodBefore !== undefined) validateMood(input.moodBefore);
    const session: SingSession = {
      id: this.newId('sess'),
      facilityId: facility.id,
      residentId: resident.id,
      playlistId: input.playlistId,
      status: 'in_progress',
      moodBefore: input.moodBefore,
      entries: [],
      startedAt: this.ts(),
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    this.store.sessions.put(session);
    return session;
  }

  /** Log how the resident responded to one song, while the session runs. */
  logEntry(sessionId: string, input: { songId: string; engagement: EngagementLevel; staffNotes?: string }): SingSession {
    const session = this.getSession(sessionId);
    if (session.status !== 'in_progress') throw new ConflictError(`cannot log against a ${session.status} session`);
    const song = this.requireSongInFacility(input.songId, session.facilityId);
    if (!ENGAGEMENT_LEVELS.includes(input.engagement)) {
      throw new ValidationError(`engagement must be one of: ${ENGAGEMENT_LEVELS.join(', ')}`);
    }
    session.entries.push({
      songId: song.id,
      songTitle: song.title,
      engagement: input.engagement,
      staffNotes: optionalString(input.staffNotes),
      at: this.ts(),
    });
    session.updatedAt = this.ts();
    this.store.sessions.put(session);
    return session;
  }

  completeSession(id: string, input?: { moodAfter?: MoodRating }): SingSession {
    const session = this.getSession(id);
    this.assertTransition(session, 'completed');
    if (input?.moodAfter !== undefined) {
      validateMood(input.moodAfter);
      session.moodAfter = input.moodAfter;
    }
    session.status = 'completed';
    session.completedAt = this.ts();
    session.updatedAt = this.ts();
    this.store.sessions.put(session);
    return session;
  }

  cancelSession(id: string): SingSession {
    const session = this.getSession(id);
    this.assertTransition(session, 'cancelled');
    session.status = 'cancelled';
    session.updatedAt = this.ts();
    this.store.sessions.put(session);
    return session;
  }

  getSession(id: string): SingSession {
    return this.require(this.store.sessions, 'Session', id);
  }

  listSessions(filter?: { facilityId?: string; residentId?: string }): SingSession[] {
    return this.store.sessions
      .list(
        (s) =>
          (!filter?.facilityId || s.facilityId === filter.facilityId) &&
          (!filter?.residentId || s.residentId === filter.residentId),
      )
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /** What's actually working for this resident, learned from session history. */
  insightsForResident(residentId: string, limit?: number): SongInsight[] {
    const resident = this.getResident(residentId);
    const sessions = this.listSessions({ facilityId: resident.facilityId, residentId: resident.id });
    return topSongsForResident(sessions, resident.id, limit);
  }

  // --- internals -----------------------------------------------------------

  private requireFacility(id: string): Facility {
    return this.require(this.store.facilities, 'Facility', id);
  }

  private requireSongInFacility(songId: string, facilityId: string): Song {
    const song = this.require(this.store.songs, 'Song', songId);
    if (song.facilityId !== facilityId) throw new ValidationError('song belongs to another facility');
    return song;
  }

  private assertTransition(session: SingSession, to: SingSession['status']): void {
    if (!canTransition(session.status, to)) {
      throw new ConflictError(`cannot change a ${session.status} session to ${to}`);
    }
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError(`${what} id is required`);
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private ts(): string {
    return this.now().toISOString();
  }
}

function validateMood(value: MoodRating): void {
  if (!MOOD_RATINGS.includes(value)) throw new ValidationError(`mood must be one of: ${MOOD_RATINGS.join(', ')}`);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ValidationError('expected an array of strings');
  }
  const cleaned = value.map((v) => v.trim()).filter((v) => v.length > 0);
  return cleaned.length === 0 ? undefined : cleaned;
}

function validateUrl(value: unknown): string | undefined {
  const s = optionalString(value);
  if (s === undefined) return undefined;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return s;
  } catch {
    throw new ValidationError('audioUrl must be a valid URL');
  }
}
