/**
 * Build-time data pipeline.
 *
 * The Flask app parsed four workbooks + a CSV on every cold start. Here we
 * do it once at build time and emit plain JSON that the Next.js app imports,
 * so no spreadsheet library ships to the runtime at all.
 *
 * Sources (all under timetable/ and students/):
 *   students/2024students.csv                             roll,name,section
 *   timetable/Section detail_5th.xlsx                     Core + Elective sheets
 *   timetable/5th_Semester_timetable_core_elective_student.xlsx   Section Grid
 *   timetable/Timetable_3rd_sem.xls                       section_detail sheet
 *   timetable/4th semester TT and Section Detail.xls      Section Detail sheet
 *
 * Every non-obvious transform here mirrors a hard-won fix in the Flask
 * version; the comments flag the ones that bite.
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

/** A populated cell is three lines: course, faculty, room. */
function parseSlot(cell: unknown): Slot | null {
  const text = cellText(cell);
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return { c: lines[0] ?? "", f: lines[1] ?? "", r: lines[2] ?? "" };
}

interface GridResult {
  periods: Periods;
  days: string[];
  schedule: Record<string, Record<string, (Slot | null)[]>>;
}

function buildGrid(): GridResult {
  const empty: GridResult = { periods: [], days: [], schedule: {} };
  const wb = readWorkbook(
    join(ROOT, "timetable", "5th_Semester_timetable_core_elective_student.xlsx"),
  );
  if (!wb || !wb.SheetNames.includes("Section Grid")) return empty;

  const data = rows(wb.Sheets["Section Grid"]);
  if (data.length === 0) return empty;

  const periods = parsePeriods(data[0]);
  const days: string[] = [];
  const schedule: GridResult["schedule"] = {};

  // The sheet stacks EVERY semester's sections back to back, each block
  // introduced by a group header like "Sem 5 | CS-S5 | CS1". Section codes are
  // reused across semesters -- Sem 5's "CS1" and Sem 7's "CS1" are different
  // sections, and 42 codes collide. Without tracking which block we're inside,
  // the later Sem 7 rows silently overwrite real Sem 5 data (and blank out the
  // days Sem 7 doesn't use). Scope strictly to semester 5.
  let currentSemester: number | null = null;

  for (const row of data.slice(1)) {
    const first = cellText(row[0]);
    if (!first) continue;

    const isGroupHeader = first.includes("|") || /^Sem\s/i.test(first);
    if (isGroupHeader) {
      const m = /^Sem\s*(\d+)/i.exec(first);
      currentSemester = m ? Number.parseInt(m[1], 10) : null;
      continue;
    }
    if (currentSemester !== 5) continue;

    const day = cellText(row[1]);
    if (!day) continue;
    if (!days.includes(day)) days.push(day);

    const slots: (Slot | null)[] = periods.map((_, i) => parseSlot(row[2 + i]));
    schedule[first] ??= {};
    schedule[first][day] = slots;
  }

  return { periods, days, schedule };
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
