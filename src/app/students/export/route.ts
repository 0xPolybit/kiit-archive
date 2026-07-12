import type { NextRequest } from "next/server";

import { applyFilters, parseQuery, sortStudents } from "@/lib/students";

/** RFC 4180: wrap in quotes and double any embedded quotes. */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * Stream the filtered result set as CSV. Honours every filter and the sort
 * order, but deliberately ignores pagination — a download should contain all
 * the matches, not just the page you happened to be looking at.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = parseQuery(params);
  const rows = sortStudents(applyFilters(query), query);

  const lines = [
    ["Roll Number", "Student Name", "Section", "Course"].join(","),
    ...rows.map((s) =>
      [s.roll, s.name, s.section, s.course].map(csvCell).join(","),
    ),
  ];

  // Trailing newline: standard for text/CSV, and what Python's csv.writer
  // emitted, so downstream parsers see the same byte stream as before.
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="kiit-archive-students-2024-28.csv"',
    },
  });
}
