/** Timetable lookup: resolve an identifier (or several) to students. */
import {
  findByName,
  getSections,
  getStudent,
  hasSection,
  rollsInSection,
  rollsWithPrefix,
  scheduleFor,
} from "./data";
import type { SectionAssignment, Slot, Student } from "./types";

/** Cap on a single term's matches, and on the merged multi-term result. */
const SINGLE_CAP = 25;
const COMBINED_CAP = 40;

export interface Match {
  roll: string;
  student?: Student;
  assignment: SectionAssignment;
}

export interface SearchResult {
  matches: Match[];
  /** Non-empty when results were truncated or a term found nothing. */
  note: string;
}

function buildMatch(roll: string): Match {
  return { roll, student: getStudent(roll), assignment: getSections(roll) };
}

/**
 * Resolve one term. Order matters:
 *   1. exact roll
 *   2. roll prefix (>= 4 digits, so "24" doesn't return thousands)
 *   3. section code
 *   4. name substring
 */
function searchSingle(term: string): SearchResult {
  const q = term.trim();
  if (!q) return { matches: [], note: "" };

  const looksNumeric = /^\d/.test(q);

  if (looksNumeric && q.length >= 4) {
    if (getStudent(q)) return { matches: [buildMatch(q)], note: "" };

    const rolls = rollsWithPrefix(q);
    if (rolls.length > 0) {
      const matches = rolls.slice(0, SINGLE_CAP).map(buildMatch);
      const note =
        rolls.length > matches.length
          ? `Showing the first ${matches.length} of ${rolls.length} roll numbers starting with “${q}”. Use a longer prefix to narrow the search.`
          : "";
      return { matches, note };
    }
  }

  if (hasSection(q)) {
    const rolls = [...rollsInSection(q)].sort();
    if (rolls.length > 0) {
      const matches = rolls.slice(0, SINGLE_CAP).map(buildMatch);
      const note =
        rolls.length > matches.length
          ? `Showing the first ${matches.length} of ${rolls.length} students in section “${q.toUpperCase()}”. Use the Students page to browse the full section.`
          : "";
      return { matches, note };
    }
  }

  const byName = findByName(q);
  const matches = byName.slice(0, SINGLE_CAP).map((s) => buildMatch(s.roll));
  const note =
    byName.length > matches.length
      ? `Showing the first ${matches.length} of ${byName.length} name matches. Use a more specific name to narrow the search.`
      : "";
  return { matches, note };
}

/**
 * Resolve a whole query, splitting on commas so several identifiers of mixed
 * kinds can be looked up at once ("2405001, Aaryan, CS17"). Matches are
 * de-duplicated by roll, preserving the order the terms were given in.
 */
export function search(query: string): SearchResult {
  const terms = query
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (terms.length === 0) return { matches: [], note: "" };
  if (terms.length === 1) return searchSingle(terms[0]);

  const seen = new Set<string>();
  const combined: Match[] = [];
  const missed: string[] = [];

  for (const term of terms) {
    const { matches } = searchSingle(term);
    if (matches.length === 0) missed.push(term);
    for (const m of matches) {
      if (seen.has(m.roll)) continue;
      seen.add(m.roll);
      combined.push(m);
    }
  }

  const capped = combined.slice(0, COMBINED_CAP);
  const notes: string[] = [];
  if (missed.length > 0) notes.push(`No matches for: ${missed.join(", ")}.`);
  if (combined.length > capped.length) {
    notes.push(
      `Showing the first ${capped.length} of ${combined.length} combined matches across all terms. Use fewer or more specific terms to narrow the search.`,
    );
  }

  return { matches: capped, note: notes.join(" ") };
}

/** The three 5th-sem schedules shown per student, in display order. */
export interface SectionView {
  label: string;
  /** Stable class hook for the colour coding: core | pe1 | pe2 */
  slug: string;
  code?: string;
  schedule: Record<string, (Slot | null)[]>;
}

export function sectionViews(m: Match): SectionView[] {
  const { core, pe1, pe2 } = m.assignment;
  return [
    { label: "Core", slug: "core", code: core, schedule: scheduleFor(core) },
    { label: "PE1", slug: "pe1", code: pe1, schedule: scheduleFor(pe1) },
    { label: "PE2", slug: "pe2", code: pe2, schedule: scheduleFor(pe2) },
  ];
}
