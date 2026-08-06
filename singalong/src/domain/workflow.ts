/**
 * Pure logic, no I/O: session state machine, song personalization, and the
 * "what works" insight that turns logged sessions into a better next
 * playlist — the actual training loop behind this tool.
 */

import type { EngagementLevel, MoodRating, Resident, SessionEntry, SessionStatus, Song, SingSession } from './types.ts';

const ALLOWED: Record<SessionStatus, readonly SessionStatus[]> = {
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** Higher is better; used both to rank suggestions and to score outcomes. */
const ENGAGEMENT_SCORE: Record<EngagementLevel, number> = {
  sang_along: 3,
  listened_attentively: 2,
  moved_or_tapped: 2,
  no_visible_response: 0,
  agitated: -2,
};

export function engagementScore(level: EngagementLevel): number {
  return ENGAGEMENT_SCORE[level];
}

const MOOD_SCORE: Record<MoodRating, number> = { calm: 1, neutral: 0, withdrawn: -1, agitated: -2 };

/** Did the resident's mood improve, hold, or worsen across the session? */
export function moodDelta(before?: MoodRating, after?: MoodRating): number | undefined {
  if (!before || !after) return undefined;
  return MOOD_SCORE[after] - MOOD_SCORE[before];
}

/**
 * Rank a facility's song library for a resident by how well it matches their
 * known preferences (era, genre, favorite artist) — the same personalization
 * principle the evidence points to: individualized selections outperform
 * generic "relaxing" playlists. Ties keep library order.
 */
export function suggestSongs(resident: Resident, songs: Song[], limit = 10): Song[] {
  const eras = new Set((resident.preferredEras ?? []).map(norm));
  const genres = new Set((resident.preferredGenres ?? []).map(norm));
  const artists = new Set((resident.favoriteArtists ?? []).map(norm));

  const scored = songs.map((song) => {
    let score = 0;
    if (song.era && eras.has(norm(song.era))) score += 2;
    if (song.artist && artists.has(norm(song.artist))) score += 3;
    if (song.tags.some((t) => genres.has(norm(t)))) score += 1;
    return { song, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.song);
}

export interface SongInsight {
  songId: string;
  songTitle: string;
  timesPlayed: number;
  averageEngagement: number;
}

/**
 * Learn which songs actually land for a resident from their session history —
 * the point of logging engagement in the first place. Only completed
 * sessions count; a cancelled session's partial entries aren't a verdict.
 */
export function topSongsForResident(sessions: SingSession[], residentId: string, limit = 10): SongInsight[] {
  const totals = new Map<string, { songTitle: string; sum: number; count: number }>();
  for (const session of sessions) {
    if (session.residentId !== residentId || session.status !== 'completed') continue;
    for (const entry of session.entries) {
      const bucket = totals.get(entry.songId) ?? { songTitle: entry.songTitle, sum: 0, count: 0 };
      bucket.sum += engagementScore(entry.engagement);
      bucket.count += 1;
      totals.set(entry.songId, bucket);
    }
  }
  return [...totals.entries()]
    .map(([songId, { songTitle, sum, count }]) => ({ songId, songTitle, timesPlayed: count, averageEngagement: sum / count }))
    .sort((a, b) => b.averageEngagement - a.averageEngagement)
    .slice(0, limit);
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function entrySummary(entries: SessionEntry[]): { sangAlong: number; total: number } {
  return { sangAlong: entries.filter((e) => e.engagement === 'sang_along').length, total: entries.length };
}
