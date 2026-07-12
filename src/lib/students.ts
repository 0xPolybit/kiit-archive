/** Student-directory query engine: filter -> facet -> sort -> paginate. */
import { students } from "./data";
import type { Student } from "./types";

export const SCHEME_OPTIONS = ["both", "A", "B"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;

export const SORT_KEYS = {
  roll: "Roll Number",
  name: "Student Name",
  course: "Course",
  section: "Section",
} as const;

export type SortKey = keyof typeof SORT_KEYS;

export const COURSE_CHOICES: string[] = [
  ...new Set(students.map((s) => s.course)),
]
  .filter((c) => c !== "B.Tech in [N/A]")
  .sort();

export interface Query {
  course: string;
  q: string;
  roll: string;
  scheme: string;
  batch: number;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  size: number;
}

const DEFAULTS: Query = {
  course: "Anything",
  q: "",
  roll: "",
  scheme: "both",
  batch: 0,
  sort: "roll",
  dir: "asc",
  page: 1,
  size: 25,
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** Parse URL search params into a Query, clamping anything hostile. */
export function parseQuery(params: Params): Query {
  const intIn = (v: string, def: number, lo: number, hi: number) => {
    const n = Number.parseInt(v, 10);
    if (!Number.isFinite(n)) return def;
    return Math.max(lo, Math.min(hi, n));
  };

  const sort = one(params.sort) as SortKey;
  const size = Number.parseInt(one(params.size), 10);
  const dir = one(params.dir);

  return {
    course: one(params.course) || DEFAULTS.course,
    q: one(params.q).trim(),
    roll: one(params.roll).trim(),
    scheme: SCHEME_OPTIONS.includes(one(params.scheme) as never)
      ? one(params.scheme)
      : DEFAULTS.scheme,
    batch: intIn(one(params.batch), 0, 0, 33),
    sort: sort in SORT_KEYS ? sort : DEFAULTS.sort,
    dir: dir === "desc" ? "desc" : "asc",
    page: intIn(one(params.page), 1, 1, 10_000),
    size: (PAGE_SIZES as readonly number[]).includes(size)
      ? size
      : DEFAULTS.size,
  };
}

/** Has the user actually narrowed anything? Drives the empty state. */
export function isFiltered(query: Query): boolean {
  return (
    query.course !== "Anything" ||
    query.q !== "" ||
    query.roll !== "" ||
    query.scheme !== "both" ||
    query.batch !== 0
  );
}

export interface Chip {
  label: string;
  value: string;
  /** Query key to clear when the chip is dismissed. */
  key: keyof Query;
}

export function activeChips(query: Query): Chip[] {
  const chips: Chip[] = [];
  if (query.course !== "Anything")
    chips.push({ label: "Course", value: query.course, key: "course" });
  if (query.q) chips.push({ label: "Name", value: query.q, key: "q" });
  if (query.roll) chips.push({ label: "Roll", value: query.roll, key: "roll" });
  if (query.scheme !== "both")
    chips.push({ label: "Scheme", value: query.scheme, key: "scheme" });
  if (query.batch !== 0)
    chips.push({
      label: "Batch",
      value: String(query.batch).padStart(2, "0"),
      key: "batch",
    });
  return chips;
}

export function applyFilters(query: Query): Student[] {
  const name = query.q.toLowerCase();
  const roll = query.roll.toLowerCase();

  return students.filter((s) => {
    if (name && !s.name.toLowerCase().includes(name)) return false;
    if (roll && !s.roll.toLowerCase().includes(roll)) return false;
    if (query.course !== "Anything" && s.course !== query.course) return false;
    if (query.scheme !== "both" && s.scheme !== query.scheme) return false;
    if (query.batch !== 0 && s.batch !== query.batch) return false;
    return true;
  });
}

export function sortStudents(rows: Student[], query: Query): Student[] {
  const dir = query.dir === "desc" ? -1 : 1;
  const cmp = (a: Student, b: Student): number => {
    switch (query.sort) {
      case "name":
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      case "course":
        return (
          a.course.toLowerCase().localeCompare(b.course.toLowerCase()) ||
          a.roll.localeCompare(b.roll)
        );
      case "section":
        return (
          a.scheme.localeCompare(b.scheme) ||
          a.batch - b.batch ||
          a.roll.localeCompare(b.roll)
        );
      case "roll":
      default: {
        // Natural (numeric) roll order, with a string fallback for safety.
        const na = Number(a.roll);
        const nb = Number(b.roll);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.roll.localeCompare(b.roll);
      }
    }
  };
  return [...rows].sort((a, b) => cmp(a, b) * dir);
}

export interface Facets {
  course: [string, number][];
  section: [string, number][];
}

export function facets(rows: Student[]): Facets {
  const byCourse = new Map<string, number>();
  const bySection = new Map<string, number>();
  for (const s of rows) {
    byCourse.set(s.course, (byCourse.get(s.course) ?? 0) + 1);
    bySection.set(s.section, (bySection.get(s.section) ?? 0) + 1);
  }
  return {
    course: [...byCourse.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
    section: [...bySection.entries()].sort(
      (a, b) =>
        a[0][0].localeCompare(b[0][0]) ||
        Number(a[0].slice(1)) - Number(b[0].slice(1)),
    ),
  };
}

export interface Result {
  rows: Student[];
  total: number;
  pages: number;
  page: number;
  facets: Facets;
}

export function runQuery(query: Query): Result {
  const filtered = applyFilters(query);
  const f = facets(filtered);
  const sorted = sortStudents(filtered, query);

  const total = sorted.length;
  const pages = total ? Math.max(1, Math.ceil(total / query.size)) : 1;
  const page = Math.min(query.page, pages);
  const start = (page - 1) * query.size;

  return {
    rows: sorted.slice(start, start + query.size),
    total,
    pages,
    page,
    facets: f,
  };
}

/** Serialise a query back to URL params, omitting defaults for clean links. */
export function toParams(query: Partial<Query>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (DEFAULTS[k as keyof Query] === v) continue;
    p.set(k, String(v));
  }
  return p;
}
