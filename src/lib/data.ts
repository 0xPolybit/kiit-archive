/**
 * Runtime data access.
 *
 * Everything here reads the JSON emitted by scripts/build-data.ts, so no
 * spreadsheet parsing happens at request time. The module-level maps are built
 * once per server process.
 */
import raw from "@/data/generated/data.json";
import type {
  DataStats,
  GeneratedData,
  SectionAssignment,
  Slot,
  Student,
  Timetable,
} from "./types";

const data = raw as unknown as GeneratedData;

export const students: Student[] = data.students;
export const timetable: Timetable = data.timetable;
export const stats: DataStats = data.stats;
export const sections: Record<string, SectionAssignment> = data.sections;

/**
 * roll -> student. The source CSV contains at least one roll listed twice in
 * two different sections; the directory keeps both rows, but a point lookup has
 * to pick one, so it resolves to the first occurrence deterministically.
 */
const studentByRoll = new Map<string, Student>();
for (const s of students) {
  if (!studentByRoll.has(s.roll)) studentByRoll.set(s.roll, s);
}

/** Every roll we know about, across the CSV and all section sheets. */
const allRolls: string[] = [
  ...new Set([...studentByRoll.keys(), ...Object.keys(sections)]),
].sort();

/** Uppercased section code -> the rolls assigned to it (core or elective). */
const rollsBySection = new Map<string, string[]>();
for (const [roll, a] of Object.entries(sections)) {
  for (const code of [a.core, a.pe1, a.pe2]) {
    if (!code) continue;
    const key = code.toUpperCase();
    const list = rollsBySection.get(key);
    if (list) list.push(roll);
    else rollsBySection.set(key, [roll]);
  }
}

const scheduleSections = new Set(
  Object.keys(timetable.schedule).map((s) => s.toUpperCase()),
);

export function getStudent(roll: string): Student | undefined {
  return studentByRoll.get(roll);
}

export function getSections(roll: string): SectionAssignment {
  return sections[roll] ?? {};
}

/** True if the code names a section that actually has a schedule. */
export function hasSection(code: string): boolean {
  return scheduleSections.has(code.trim().toUpperCase());
}

export function rollsInSection(code: string): string[] {
  return rollsBySection.get(code.trim().toUpperCase()) ?? [];
}

export function rollsWithPrefix(prefix: string): string[] {
  return allRolls.filter((r) => r.startsWith(prefix));
}

export function findByName(query: string, limit = Infinity): Student[] {
  const q = query.toLowerCase();
  const out: Student[] = [];
  for (const s of students) {
    if (s.name.toLowerCase().includes(q)) {
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** The schedule for a section: day -> one slot per period (null = free). */
export function scheduleFor(
  code: string | undefined,
): Record<string, (Slot | null)[]> {
  if (!code) return {};
  return timetable.schedule[code] ?? {};
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Today's weekday name, matching the labels used in the timetable sheet. */
export function todayName(now: Date = new Date()): string {
  // JS getDay(): 0 = Sunday. Rotate so Monday is index 0, as the sheet expects.
  return DAY_NAMES[(now.getDay() + 6) % 7];
}
