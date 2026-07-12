/**
 * PYQ lookup. Unlike the other datasets this one is read at request time, not
 * baked in at build: papers are dropped into pyqs/ as loose PDFs/JPGs plus two
 * metadata files, and we want a new upload to show up without a rebuild.
 *
 * Both metadata files are optional — an empty pyqs/ just yields the
 * "contribute" state rather than an error.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const YEAR_OPTIONS = ["2024-25"];
export const SEMESTER_OPTIONS = ["Semester 1", "Semester 2"];

export const CONTRIBUTE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfELG83aiBPhSVmuKrq6JtwhVl0eM4wEmp0PquhlD2wAklTPw/viewform?usp=sf_link";

export interface Pyq {
  "academic-year": string;
  "subject-code": string;
  exam: string;
  semester: number;
  /** Filename prefix shared by the PDF and its page JPGs. */
  file: string;
  credit?: string;
}

const PYQ_DIR = join(process.cwd(), "pyqs");

/** Odd semesters run Autumn/Winter; even ones Spring/Summer. */
export function examOptions(semester: number): string[] {
  return semester % 2 === 0
    ? ["Mid Semester (Spring)", "End Semester (Summer)"]
    : ["Mid Semester (Autumn)", "End Semester (Winter)"];
}

function readJson<T>(name: string, fallback: T): T {
  const path = join(PYQ_DIR, name);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    console.warn(`pyqs: could not parse ${name}`);
    return fallback;
  }
}

export function loadSubjects(semester: number): string[] {
  const all = readJson<string[][]>("subjects.json", []);
  const subjects = all[semester - 1] ?? [];
  // Sort by the trailing subject code rather than the display name.
  return [...subjects].sort((a, b) =>
    a.slice(-8, -1).localeCompare(b.slice(-8, -1)),
  );
}

export function findPyq(
  year: string,
  subject: string,
  exam: string,
  semester: number,
): Pyq | undefined {
  return readJson<Pyq[]>("pyqs.json", []).find(
    (p) =>
      p["academic-year"] === year &&
      p["subject-code"].includes(subject) &&
      p.exam === exam &&
      p.semester === semester,
  );
}

/** The PDF and page images belonging to a paper, by filename prefix. */
export function filesFor(prefix: string): { pdf?: string; pages: string[] } {
  if (!existsSync(PYQ_DIR)) return { pages: [] };
  const names = readdirSync(PYQ_DIR).filter((n) => n.startsWith(prefix));
  return {
    pdf: names.find((n) => n.toLowerCase().endsWith(".pdf")),
    pages: names.filter((n) => n.toLowerCase().endsWith(".jpg")).sort(),
  };
}

/**
 * Resolve a user-supplied filename inside pyqs/, refusing anything that tries
 * to escape the directory. Returns null if unsafe or missing.
 */
export function safePyqPath(name: string, ext: ".pdf" | ".jpg"): string | null {
  if (
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith(".")
  ) {
    return null;
  }
  if (!name.toLowerCase().endsWith(ext)) return null;

  const path = join(PYQ_DIR, name);
  // Belt and braces: the resolved path must still sit inside pyqs/.
  if (!path.startsWith(PYQ_DIR)) return null;
  return existsSync(path) ? path : null;
}
