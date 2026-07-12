/** Shared domain types — used by both the build script and the app. */

export interface Student {
  roll: string;
  name: string;
  /** "A" or "B" */
  scheme: string;
  /** 1..33 */
  batch: number;
  /** Zero-padded, e.g. "B01" */
  section: string;
  course: string;
}

/** A populated timetable cell: course / faculty / room. */
export interface Slot {
  c: string;
  f: string;
  r: string;
}

export interface Period {
  /** "P1" */
  label: string;
  /** "8:00 AM-9:00 AM", or "08:00" on older exports */
  time: string;
}

export type Periods = Period[];

/** Which sections a roll number belongs to, across semesters. */
export interface SectionAssignment {
  core?: string;
  pe1?: string;
  pe2?: string;
  /** 3rd-semester section code — reference only, no schedule available. */
  sem3?: string;
  /** 4th-semester section code — reference only, no schedule available. */
  sem4?: string;
}

export interface Timetable {
  periods: Periods;
  days: string[];
  /** section -> day -> slot per period (null = free) */
  schedule: Record<string, Record<string, (Slot | null)[]>>;
}

export interface DataStats {
  students: number;
  sectionsInSchedule: number;
  periods: number;
  days: string[];
  coreRolls: number;
  electiveRolls: number;
  sem3Rolls: number;
  sem4Rolls: number;
}

export interface GeneratedData {
  students: Student[];
  sections: Record<string, SectionAssignment>;
  timetable: Timetable;
  stats: DataStats;
  generatedAt: string;
}
