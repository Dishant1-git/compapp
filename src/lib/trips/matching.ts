// Travel-personality matching. Pure functions, safe to use anywhere.

/**
 * Overlap between two sets of personality tags as 0–100 (Dice coefficient).
 * Returns null when either side hasn't picked any tags.
 */
export function compatibility(a: readonly string[], b: readonly string[]): number | null {
  if (!a.length || !b.length) return null;
  const other = new Set(b);
  const shared = new Set(a.filter((tag) => other.has(tag))).size;
  return Math.round(((2 * shared) / (new Set(a).size + other.size)) * 100);
}

/**
 * How well a traveller fits a trip: 40% the trip's vibe, 60% the people
 * already booked. Falls back to whichever signal exists.
 */
export function tripCompatibility(
  mine: readonly string[],
  vibes: readonly string[],
  groupPersonalities: readonly (readonly string[])[],
): number | null {
  if (!mine.length) return null;

  const vibeScore = compatibility(mine, vibes);
  const memberScores = groupPersonalities
    .map((p) => compatibility(mine, p))
    .filter((n): n is number => n !== null);
  const groupScore = memberScores.length
    ? memberScores.reduce((sum, n) => sum + n, 0) / memberScores.length
    : null;

  if (vibeScore === null) return groupScore === null ? null : Math.round(groupScore);
  if (groupScore === null) return vibeScore;
  return Math.round(vibeScore * 0.4 + groupScore * 0.6);
}
