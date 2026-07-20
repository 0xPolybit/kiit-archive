/**
 * Build-time data pipeline.
 *
 * Parses the source workbooks + CSV once at build time and emits plain JSON
 * that the Next.js app imports, so no spreadsheet library ships to the
 * runtime at all.
 *
 * Sources (all under timetable/ and students/):
 *   students/2024students.csv                             roll,name,section
 *   timetable/Section detail_5th.xlsx                     Core + Elective sheets
 *   timetable/5th_Semester_timetable_core_elective_student.xlsx
 *       "Section Grid No Faculty"  Section, Day, P1..P10 -- 2-line cells
 *                                  ("COURSE\nROOM", no faculty)
 *       "Section Allocation Grid"  one column per course code, one row per
 *                                  section, cell = faculty name -- joined
 *                                  against the grid above by (section, course).
 *                                  NOT always present -- some exports only
 *                                  ship "Section Grid No Faculty"; see
 *                                  loadFallbackFacultyMap() below.
 *       (older exports had a single "Section Grid" sheet with 3-line cells,
 *        "COURSE\nFACULTY\nROOM" -- still supported as a fallback)
 *   timetable/Section Allocation Grid (faculty roster).xlsx
 *       Standalone copy of the last export's "Section Allocation Grid" sheet.
 *       Used only when the current schedule export doesn't ship its own --
 *       see loadFallbackFacultyMap().
 *   timetable/Timetable_3rd_sem.xls                       section_detail sheet
 *   timetable/4th semester TT and Section Detail.xls      Section Detail sheet
 *   timetable/CD and DMDW new section.xlsx                "new list" sheet --
 *       roll -> new PE2 section override (CD/DMDW re-sectioning), applied on
 *       top of Section detail_5th.xlsx's Elective sheet for the rolls listed
 *
 * Every non-obvious transform here mirrors a hard-won fix from an earlier
 * export's quirks; the comments flag the ones that bite.
 */
import * as XLSX from "xlsx";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  GeneratedData,
  Periods,
  SectionAssignment,
  Slot,
  Student,
} from "../src/lib/types";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "src", "data", "generated");

/** Roll-number digits 3-4 identify the programme. */
const COURSE_CODES: Record<string, string> = {
  "01": "B.Tech in Civil Engineering",
  "02": "B.Tech in Mechanical Engineering",
  "03": "B.Tech in Electrical Engineering",
  "04": "B.Tech in Electronics & Telecommunications",
  "05": "B.Tech in Computer Science and Engineering",
  "06": "B.Tech in Information Technology",
  "07": "B.Tech in Electronics & Electrical Engineering",
  "09": "B.Tech in Mechanical (Automobile) Engineering",
  "15": "B.Tech in Computer Science & Engineering (AL/ML)",
  "24": "B.Tech in Chemical Technology",
  "25": "B.Arch in Architecture",
  "26": "B.Tech in Mechatronics Engineering",
  "27": "B.Tech in Aerospace Engineering",
  "28": "B.Tech in Computer Science and Systems Engineering",
  "29": "B.Tech in Computer Science and Communications",
  "30": "B.Tech in Electronics and Computer Science",
};

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

/**
 * Spreadsheet engines hand back numeric roll numbers as numbers (xlrd gave
 * Python `2405001.0`). Normalise to the bare digit string used everywhere else.
 */
function toRoll(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return String(Math.trunc(value));
  const s = String(value).trim();
  return s === "" ? null : s;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * The 3rd/4th-sem sheets zero-pad section codes ("CSE-01") while the timetable
 * sheet does not ("CSE-1"), and the two legacy files disagree with each other.
 * Canonicalise to PREFIX-N so they compare equal.
 */
function normalizeSectionCode(section: string): string {
  const s = section.trim().toUpperCase();
  const m = /^([A-Z]+)-0*(\d+)$/.exec(s);
  return m ? `${m[1]}-${m[2]}` : s;
}

/** Read a sheet as a dense array-of-rows, mirroring openpyxl's values_only. */
function rows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
}

function readWorkbook(path: string): XLSX.WorkBook | null {
  if (!existsSync(path)) {
    console.warn(`  ! missing (skipped): ${path}`);
    return null;
  }
  return XLSX.readFile(path);
}

// ---------------------------------------------------------------------------
// students/2024students.csv
// ---------------------------------------------------------------------------

function buildStudents(): Student[] {
  const path = join(ROOT, "students", "2024students.csv");
  if (!existsSync(path)) {
    console.warn("  ! students CSV missing");
    return [];
  }

  const out: Student[] = [];
  const text = readFileSync(path, "utf8");
  const seen = new Map<string, string>(); // roll -> first section seen

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 3) continue;

    // Every cell in this CSV carries leading whitespace (" Aaryan Guru",
    // " A01"). The original Streamlit code compared section[0] without
    // stripping, so its scheme filter matched a space and always returned
    // zero rows. Strip first, always.
    const roll = parts[0].trim();
    const name = parts[1].trim();
    const section = parts[2].trim();
    if (!roll || !name || !section) continue;

    const scheme = section[0].toUpperCase();
    if (scheme !== "A" && scheme !== "B") continue;

    const batch = Number.parseInt(section.slice(1), 10);
    if (!Number.isFinite(batch)) continue;

    // The source CSV genuinely lists at least one roll twice, in two
    // different sections. We keep BOTH rows (the directory should show what
    // the source actually says rather than silently picking one), but flag it
    // so the data issue stays visible instead of rotting quietly.
    if (seen.has(roll)) {
      console.warn(
        `  ! duplicate roll ${roll} (${name}): sections ${seen.get(roll)} and ${section} ` +
          `— both kept in the directory; roll lookups resolve to the first.`,
      );
    } else {
      seen.set(roll, section);
    }

    out.push({
      roll,
      name,
      scheme,
      batch,
      section: `${scheme}${String(batch).padStart(2, "0")}`,
      course: COURSE_CODES[roll.slice(2, 4)] ?? "B.Tech in [N/A]",
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// timetable/5th_Semester_timetable_core_elective_student.xlsx  (Section Grid)
// ---------------------------------------------------------------------------

/**
 * Period header cells have shipped in two shapes across exports:
 *   "P1\n08:00"              (older)
 *   "P1 (8:00 AM-9:00 AM)"   (current)
 * Prefer the parenthesised range when present; fall back to a bare time.
 */
function parsePeriods(header: unknown[]): Periods {
  const periods: Periods = [];
  for (const cell of header.slice(2)) {
    const text = cellText(cell);
    const num = /^P(\d+)/.exec(text);
    if (!num) continue;

    const paren = /\(([^)]+)\)/.exec(text);
    const time = /(\d{1,2}:\d{2}(?:\s*[APap][Mm])?)/.exec(text);
    periods.push({
      label: `P${num[1]}`,
      time: paren ? paren[1].trim() : time ? time[1] : "",
    });
  }
  return periods;
}

/**
 * Yield only the data rows belonging to semester 5, tracking group-header
 * rows ("Sem 5 | CS-S5 | CS1", "6 course group(s)") as the sheet is walked.
 *
 * Both the schedule sheet and the faculty-allocation sheet stack every
 * semester's sections back to back, and section codes are reused across
 * semesters -- Sem 5's "CS1" and Sem 7's "CS1" are different sections, and 42
 * codes collide between them. Rows outside the Sem 5 block are skipped
 * entirely rather than merged, so a same-named later section can't silently
 * overwrite the real one (and can't blank out days the other semester
 * doesn't use).
 */
function* semester5Rows(data: unknown[][]): Generator<unknown[]> {
  let currentSemester: number | null = null;
  for (const row of data) {
    const first = cellText(row[0]);
    if (!first) continue; // blank separator row

    const isGroupHeader = first.includes("|") || /^Sem\s/i.test(first);
    if (isGroupHeader) {
      const m = /^Sem\s*(\d+)/i.exec(first);
      currentSemester = m ? Number.parseInt(m[1], 10) : null;
      continue;
    }
    if (currentSemester === 5) yield row;
  }
}

/** Older export shape: a populated cell is three lines, course/faculty/room. */
function parseSlotInline(cell: unknown): Slot | null {
  const text = cellText(cell);
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return { c: lines[0] ?? "", f: lines[1] ?? "", r: lines[2] ?? "" };
}

/**
 * Current export shape: a populated cell is two lines, course/room -- the
 * faculty name is looked up separately from the "Section Allocation Grid"
 * sheet, keyed by (section, course code).
 */
function parseSlotWithFaculty(
  cell: unknown,
  facultyMap: Map<string, Map<string, string>>,
  section: string,
): Slot | null {
  const text = cellText(cell);
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const course = lines[0] ?? "";
  const room = lines[1] ?? "";
  const faculty = facultyMap.get(section)?.get(course) ?? "";
  return { c: course, f: faculty, r: room };
}

/**
 * Build (section -> course code -> faculty) from the "Section Allocation
 * Grid" sheet. Each semester-5 group ("Sem 5 | CS-S5", "Sem 5 | HPC-S5-PE1",
 * ...) repeats its own "Section" column-header row naming the course codes
 * for that group's columns (e.g. "CN\nCORE" -> course code "CN"; elective
 * groups have exactly one course column, e.g. "HPC\nPE"); the section rows
 * beneath hold the faculty teaching each course for that section.
 */
function buildFacultyMap(allocData: unknown[][]): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>();
  let courseCols: (string | null)[] | null = null;

  for (const row of semester5Rows(allocData)) {
    const first = cellText(row[0]);

    if (first === "Section") {
      courseCols = row.slice(1).map((cell) => {
        const text = cellText(cell);
        return text ? (text.split(/\r?\n/)[0]?.trim() ?? null) : null;
      });
      continue;
    }
    if (!courseCols) continue; // malformed sheet; no column header seen yet

    const bySection = map.get(first) ?? new Map<string, string>();
    courseCols.forEach((code, i) => {
      if (!code) return;
      const faculty = cellText(row[1 + i]);
      if (faculty) bySection.set(code, faculty);
    });
    if (bySection.size > 0) map.set(first, bySection);
  }

  return map;
}

interface GridResult {
  periods: Periods;
  days: string[];
  schedule: Record<string, Record<string, (Slot | null)[]>>;
}

const EMPTY_GRID: GridResult = { periods: [], days: [], schedule: {} };

/**
 * Current shape: schedule and faculty roster split across two sheets.
 *
 * `facultyMap` is passed in rather than read from `wb` directly, because the
 * schedule export doesn't reliably include its own "Section Allocation Grid"
 * sheet every time (see buildGrid() for where the fallback roster comes from).
 */
function buildGridSplitFaculty(
  wb: XLSX.WorkBook,
  facultyMap: Map<string, Map<string, string>>,
): GridResult {
  const gridData = rows(wb.Sheets["Section Grid No Faculty"]);
  if (gridData.length === 0) return EMPTY_GRID;

  const periods = parsePeriods(gridData[0]);
  const days: string[] = [];
  const schedule: GridResult["schedule"] = {};

  for (const row of semester5Rows(gridData.slice(1))) {
    const section = cellText(row[0]);
    const day = cellText(row[1]);
    if (!day) continue;
    if (!days.includes(day)) days.push(day);

    const slots: (Slot | null)[] = periods.map((_, i) =>
      parseSlotWithFaculty(row[2 + i], facultyMap, section),
    );
    schedule[section] ??= {};
    schedule[section][day] = slots;
  }

  return { periods, days, schedule };
}

/**
 * Older shape: a single "Section Grid" sheet with faculty embedded in the
 * cell text. Kept as a fallback in case a future export reverts to this
 * shape; not the current path.
 */
function buildGridInlineFaculty(wb: XLSX.WorkBook): GridResult {
  const data = rows(wb.Sheets["Section Grid"]);
  if (data.length === 0) return EMPTY_GRID;

  const periods = parsePeriods(data[0]);
  const days: string[] = [];
  const schedule: GridResult["schedule"] = {};

  for (const row of semester5Rows(data.slice(1))) {
    const section = cellText(row[0]);
    const day = cellText(row[1]);
    if (!day) continue;
    if (!days.includes(day)) days.push(day);

    const slots: (Slot | null)[] = periods.map((_, i) => parseSlotInline(row[2 + i]));
    schedule[section] ??= {};
    schedule[section][day] = slots;
  }

  return { periods, days, schedule };
}

/**
 * timetable/Section Allocation Grid (faculty roster).xlsx is a standalone
 * copy of the last export that DID include its own "Section Allocation Grid"
 * sheet, extracted once and checked into the repo. The schedule workbook
 * doesn't reliably include a fresh copy of that sheet on every export (one
 * export dropped it entirely), so this file exists purely as a faculty-name
 * fallback -- course/room/day always come from the current schedule export,
 * never from here. Re-extract it (see scripts/build-data.ts git history for
 * the one-off extraction script) whenever a future export brings its own
 * fresher Allocation Grid, so the fallback doesn't go stale forever.
 */
function loadFallbackFacultyMap(): Map<string, Map<string, string>> {
  const wb = readWorkbook(
    join(ROOT, "timetable", "Section Allocation Grid (faculty roster).xlsx"),
  );
  if (!wb || !wb.SheetNames.includes("Section Allocation Grid")) {
    return new Map();
  }
  return buildFacultyMap(rows(wb.Sheets["Section Allocation Grid"]));
}

function buildGrid(): GridResult {
  const wb = readWorkbook(
    join(ROOT, "timetable", "5th_Semester_timetable_core_elective_student.xlsx"),
  );
  if (!wb) return EMPTY_GRID;

  if (wb.SheetNames.includes("Section Grid No Faculty")) {
    let facultyMap: Map<string, Map<string, string>>;
    if (wb.SheetNames.includes("Section Allocation Grid")) {
      facultyMap = buildFacultyMap(rows(wb.Sheets["Section Allocation Grid"]));
    } else {
      console.warn(
        "  ! this export has no 'Section Allocation Grid' sheet -- falling back to " +
          "the persisted faculty roster (timetable/Section Allocation Grid (faculty " +
          "roster).xlsx). New sections not in that roster (e.g. a section added since " +
          "the roster was last refreshed) will show course + room but no faculty name.",
      );
      facultyMap = loadFallbackFacultyMap();
    }
    return buildGridSplitFaculty(wb, facultyMap);
  }

  if (wb.SheetNames.includes("Section Grid")) return buildGridInlineFaculty(wb);

  console.warn(
    `  ! unrecognised sheet names in the timetable workbook: ${wb.SheetNames.join(", ")}`,
  );
  return EMPTY_GRID;
}

// ---------------------------------------------------------------------------
// Section assignments: 5th (core + electives) and legacy 3rd / 4th
// ---------------------------------------------------------------------------

function buildSections(): Record<string, SectionAssignment> {
  const out: Record<string, SectionAssignment> = {};
  const assign = (roll: string, patch: Partial<SectionAssignment>) => {
    out[roll] = { ...(out[roll] ?? {}), ...patch };
  };

  // --- 5th semester: Core + Elective sheets --------------------------------
  const detail = readWorkbook(join(ROOT, "timetable", "Section detail_5th.xlsx"));
  if (detail) {
    if (detail.SheetNames.includes("Core")) {
      for (const row of rows(detail.Sheets["Core"]).slice(1)) {
        const roll = toRoll(row[0]);
        const core = cellText(row[1]);
        if (roll && core) assign(roll, { core });
      }
    }
    if (detail.SheetNames.includes("Elective")) {
      for (const row of rows(detail.Sheets["Elective"]).slice(1)) {
        const roll = toRoll(row[0]);
        if (!roll) continue;
        const pe1 = cellText(row[1]);
        const pe2 = cellText(row[2]);
        assign(roll, { ...(pe1 && { pe1 }), ...(pe2 && { pe2 }) });
      }
    }
  }

  // --- 5th semester: CD/DMDW re-sectioning override -------------------------
  // Some PE2 students were moved between CD and DMDW sections after
  // Section detail_5th.xlsx was generated -- 5 brand-new DMDW sections
  // (DMDW21-25) were created to absorb students migrating out of CD. This
  // sheet is the authoritative override for exactly the rolls it lists;
  // every other roll keeps whatever pe2 Section detail_5th.xlsx already gave
  // it. Columns C-G hold an unrelated faculty-roster fragment pasted
  // alongside the real data (confirmed by inspection: G is just a bare
  // sequential list of the 13 section codes, unconnected to the roll in the
  // same row) -- only columns A (roll) and B (new section) matter.
  const cdDmdw = readWorkbook(join(ROOT, "timetable", "CD and DMDW new section.xlsx"));
  if (cdDmdw && cdDmdw.SheetNames.includes("new list")) {
    const newPe2 = new Map<string, string>(); // roll -> section, last row wins
    for (const row of rows(cdDmdw.Sheets["new list"]).slice(1)) {
      const roll = toRoll(row[0]);
      const section = cellText(row[1]);
      if (!roll || !section) continue;

      const prev = newPe2.get(roll);
      if (prev !== undefined && prev !== section) {
        console.warn(
          `  ! CD/DMDW re-section: roll ${roll} listed twice with different ` +
            `sections (${prev} and ${section}) — using the later one.`,
        );
      }
      newPe2.set(roll, section);
    }
    for (const [roll, pe2] of newPe2) assign(roll, { pe2 });
  }

  // --- Legacy .xls files: section code only, no schedule -------------------
  const legacy: [string, string, "sem3" | "sem4"][] = [
    ["Timetable_3rd_sem.xls", "section_detail", "sem3"],
    ["4th semester TT and Section Detail.xls", "Section Detail", "sem4"],
  ];

  for (const [file, sheetName, key] of legacy) {
    const wb = readWorkbook(join(ROOT, "timetable", file));
    if (!wb || !wb.SheetNames.includes(sheetName)) continue;
    for (const row of rows(wb.Sheets[sheetName]).slice(1)) {
      const roll = toRoll(row[0]);
      const section = cellText(row[1]);
      if (roll && section) assign(roll, { [key]: normalizeSectionCode(section) });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------

function main() {
  console.log("Building data from source workbooks...");

  const students = buildStudents();
  const { periods, days, schedule } = buildGrid();
  const sections = buildSections();

  const data: GeneratedData = {
    students,
    sections,
    timetable: { periods, days, schedule },
    stats: {
      students: students.length,
      sectionsInSchedule: Object.keys(schedule).length,
      periods: periods.length,
      days,
      coreRolls: Object.values(sections).filter((s) => s.core).length,
      electiveRolls: Object.values(sections).filter((s) => s.pe1 || s.pe2).length,
      sem3Rolls: Object.values(sections).filter((s) => s.sem3).length,
      sem4Rolls: Object.values(sections).filter((s) => s.sem4).length,
    },
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outFile = join(OUT_DIR, "data.json");
  writeFileSync(outFile, JSON.stringify(data));

  const kb = (Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(0);
  console.log(`  students            ${data.stats.students}`);
  console.log(`  sections w/ schedule ${data.stats.sectionsInSchedule}`);
  console.log(`  periods x days       ${data.stats.periods} x ${days.length}`);
  console.log(`  core / elective      ${data.stats.coreRolls} / ${data.stats.electiveRolls}`);
  console.log(`  sem3 / sem4          ${data.stats.sem3Rolls} / ${data.stats.sem4Rolls}`);
  console.log(`  -> ${outFile} (${kb} KB)`);
}

main();
