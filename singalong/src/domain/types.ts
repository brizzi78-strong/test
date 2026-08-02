/**
 * Core domain types for Sing Along — a facility-run, personalized guided
 * singing tool for dementia and memory care (the SingFit/Music & Memory
 * mechanic: match songs to a resident's own musical past, prompt the lyrics,
 * and record how they responded).
 *
 * Deliberately out of scope, by design (see README "Scope, honestly"):
 *   - no licensed audio catalog — a facility supplies its own song sources
 *     (their own devices, streaming accounts, or public-domain recordings);
 *   - no clinical fields — residents carry musical preferences and freeform
 *     biographical notes, never diagnoses, medications, or care-plan data.
 */

export interface Facility {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * A resident's musical profile. Fields are deliberately limited to what a
 * personalized-music program needs (Music & Memory's own intake asks the
 * same things): musical era, genre, favorite artists, and freeform
 * biographical notes. This is not a care record.
 */
export interface Resident {
  id: string;
  facilityId: string;
  name: string;
  preferredEras?: string[];
  preferredGenres?: string[];
  favoriteArtists?: string[];
  /** Freeform, biographical only (e.g. "sang in a church choir for 40 years"). */
  notes?: string;
  createdAt: string;
}

/** Where a song's audio/lyrics came from — a reminder, not an enforcement. */
export type SongSource = 'public_domain' | 'facility_provided';
export const SONG_SOURCES: readonly SongSource[] = ['public_domain', 'facility_provided'];

/**
 * A song in the facility's library. `audioUrl` points at wherever the
 * facility already has the right to play it from (their own streaming
 * account, a ripped CD on a shared drive, a physical iPod) — this app never
 * hosts or streams the recording itself, which is what keeps it out of music
 * licensing. `lyrics` is for the sing-along prompter and should only be
 * public-domain text or the facility's own transcription.
 */
export interface Song {
  id: string;
  facilityId: string;
  title: string;
  artist?: string;
  /** Musical era, e.g. "1940s" — the strongest predictor of resonance. */
  era?: string;
  tags: string[];
  lyrics?: string;
  audioUrl?: string;
  source: SongSource;
  createdAt: string;
}

export interface Playlist {
  id: string;
  facilityId: string;
  residentId: string;
  name: string;
  songIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** How a resident responded to one song during a session. */
export type EngagementLevel = 'sang_along' | 'listened_attentively' | 'moved_or_tapped' | 'no_visible_response' | 'agitated';
export const ENGAGEMENT_LEVELS: readonly EngagementLevel[] = [
  'sang_along',
  'listened_attentively',
  'moved_or_tapped',
  'no_visible_response',
  'agitated',
];

/** A coarse, non-clinical mood observation — not a behavioral/clinical assessment. */
export type MoodRating = 'calm' | 'neutral' | 'agitated' | 'withdrawn';
export const MOOD_RATINGS: readonly MoodRating[] = ['calm', 'neutral', 'agitated', 'withdrawn'];

export interface SessionEntry {
  songId: string;
  songTitle: string;
  engagement: EngagementLevel;
  staffNotes?: string;
  at: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';
export const SESSION_STATUSES: readonly SessionStatus[] = ['in_progress', 'completed', 'cancelled'];

/** One run of the guided sing-along, working through a resident's playlist. */
export interface SingSession {
  id: string;
  facilityId: string;
  residentId: string;
  playlistId?: string;
  status: SessionStatus;
  moodBefore?: MoodRating;
  moodAfter?: MoodRating;
  entries: SessionEntry[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
