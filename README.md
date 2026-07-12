# KIIT Archive

> An unofficial, read-only archive of publicly available KIIT University
> documents — student directory, 5th-semester timetables, and past-year
> question papers. Built with Next.js.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made by 0xPolybit](https://img.shields.io/badge/made%20by-0xPolybit-181717?logo=github)](https://github.com/0xPolybit)

> ⚠️ **Disclaimer.** A personal, unofficial project. Not affiliated with,
> endorsed by, or sponsored by KIIT University. Every record is sourced from
> publicly available KIIT documents; no sensitive information is collected.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Updating the Data](#updating-the-data)
- [Project Structure](#project-structure)
- [Deploy](#deploy)
- [Known Data Issues](#known-data-issues)
- [License](#license)

## Features

- 🧑‍🎓 **Student directory** — filter the 2024-28 cohort by name, roll, course,
  scheme, and batch. Sortable, paginated, with a faceted breakdown and CSV
  export.
- 📅 **Timetable** — look up any student by roll, name, or section code to see
  their **Core + PE1 + PE2** weekly schedule, with today's column highlighted.
  Search several identifiers at once by separating them with commas.
  Toggle between a **split** (one table per section) and **combined** (all three
  overlaid, colour-coded) view — the choice is remembered.
  3rd- and 4th-semester section codes are shown for reference.
- 📚 **PYQs** — metadata-driven lookup of past papers, with PDF download and
  page previews.
- 🌗 **Light / dark theme** — server-rendered from a cookie, so there's no
  flash of the wrong theme on load.
- 🔗 **Shareable URLs** — every filter and search lives in the query string.

## Architecture

The interesting decision is **where the spreadsheets get parsed**.

The source data is four Excel workbooks and a CSV. Rather than parse them on
every request (or every cold start), `scripts/build-data.ts` reads them **once at
build time** and emits a single `data.json`. The app imports that; no
spreadsheet library ships to the runtime, and there's no cold-start penalty.

```
timetable/*.xlsx  ─┐
timetable/*.xls   ─┼─► scripts/build-data.ts ─► src/data/generated/data.json ─► app
students/*.csv    ─┘        (npm prebuild)              (gitignored)
```

`data.json` is a derived artifact and is **not** committed — the `prebuild` hook
regenerates it before every `dev` and `build`.

Pages are React Server Components, so the ~1 MB dataset stays on the server and
never reaches the browser (First Load JS is ~103 kB). The theme and view
toggles are cookie-backed **server actions** on plain `<form>`s, so they render
correctly in the first byte of HTML and still work with JavaScript disabled.

## Quick Start

Requires **Node 22+**.

```bash
git clone https://github.com/0xPolybit/kiit-archive.git
cd kiit-archive
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` runs the data build first, so the app always starts against the
current spreadsheets.

| Script | What it does |
| --- | --- |
| `npm run dev` | Build data, then start the dev server |
| `npm run build` | Build data, then build for production |
| `npm run start` | Serve the production build (honours `$PORT`) |
| `npm run build:data` | Regenerate `data.json` only |
| `npm run typecheck` | `tsc --noEmit` |

## Updating the Data

Drop the new file into `timetable/` (or `students/`), keeping the **same
filename**, then rebuild:

```bash
npm run build:data
```

| File | Supplies |
| --- | --- |
| `students/2024students.csv` | Name, roll, section for the 2024-28 cohort |
| `timetable/Section detail_5th.xlsx` | 5th-sem Core + PE1/PE2 assignments |
| `timetable/5th_Semester_timetable_core_elective_student.xlsx` | 5th-sem weekly grid |
| `timetable/Timetable_3rd_sem.xls` | 3rd-sem section codes (reference only) |
| `timetable/4th semester TT and Section Detail.xls` | 4th-sem section codes (reference only) |

The build script prints a summary (row counts, sections, warnings) — check it
after swapping a file. Two gotchas it already handles:

- The 5th-sem grid workbook also contains **Semester 7** sections, and 42 codes
  collide with Semester 5. Rows are scoped to Sem 5 only.
- The 3rd/4th-sem sheets zero-pad section codes (`CSE-01`) inconsistently with
  the timetable sheet (`CSE-1`). Codes are normalised.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx            # Shell; reads the theme cookie server-side
│   ├── actions.ts            # Server actions: theme + view toggles
│   ├── page.tsx              # Home
│   ├── students/
│   │   ├── page.tsx          # Filters, chips, sort, pagination, facets
│   │   └── export/route.ts   # CSV download
│   ├── timetable/page.tsx    # Search, split/combined views
│   └── pyqs/
│       ├── page.tsx
│       ├── download/[name]/  # PDF (path-traversal guarded)
│       └── image/[name]/     # Page scans
├── components/               # Nav, Icon, Placeholder
├── lib/
│   ├── types.ts              # Shared domain types
│   ├── data.ts               # Loads generated JSON; lookup helpers
│   ├── students.ts           # Filter -> facet -> sort -> paginate
│   ├── timetable.ts          # Search heuristics, comma multi-term
│   └── pyqs.ts               # PYQ metadata (read at request time)
└── data/generated/           # data.json (gitignored, built)

scripts/build-data.ts         # The spreadsheet -> JSON pipeline
timetable/, students/, pyqs/  # Source data
backup_flask/                 # Previous Flask app (gitignored)
```

## Deploy

The repo ships a [Render blueprint](render.yaml): **New → Blueprint**, point it
at this repo, done. Build is `npm ci && npm run build`, start is `npm run start`.

It also deploys to Vercel with zero configuration.

Because `prebuild` regenerates the data, **pushing an updated spreadsheet is all
that's needed to refresh the deployed site** — no separate data step.

## Known Data Issues

Surfaced rather than silently patched, since they're bugs in the source data:

- **Roll `24156202` (Kumari Akanksha) appears twice** in `2024students.csv`, in
  both section `A29` and `A30`. The directory shows both rows (the source really
  does say both); point lookups resolve to the first. `build-data.ts` prints a
  warning on every build. Fixing the CSV will make it disappear.

## License

MIT. Data is sourced from publicly available KIIT University documents.

## Credits

Built and maintained by [0xPolybit](https://github.com/0xPolybit).
Material Symbols by Google; Inter by Rasmus Andersson.
