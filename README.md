# KIIT Archive

> An unofficial, read-only archive of publicly available KIIT University
> documents — student directory, previous-year question papers, and
> free-course links. Built with Flask.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made by 0xPolybit](https://img.shields.io/badge/made%20by-0xPolybit-0xPolybit?logo=github)](https://github.com/0xPolybit)
[![Status: Unofficial](https://img.shields.io/badge/status-unofficial-orange)]()

> ⚠️ **Disclaimer.** This project is a personal, unofficial archive. It
> is not affiliated with, endorsed by, or sponsored by KIIT University.
> Every record is sourced from publicly available KIIT documents; no
> sensitive information is collected or displayed.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Students](#students)
  - [Previous-Year Questions](#previous-year-questions)
  - [Books](#books)
  - [GPA Calculator](#gpa-calculator)
  - [Courses](#courses)
  - [Terms](#terms)
- [Adding Data](#adding-data)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Credits](#credits)

---

## About

**KIIT Archive** is a small, self-hostable web app that exposes
publicly available KIIT University records in a structured,
searchable form. It started as a Streamlit prototype and was rewritten
on top of Flask + Jinja2 so the same archive can be deployed on a
$5 VPS or run locally with a single command.

The project intentionally:

- **holds no personal data** beyond what KIIT itself publishes;
- **does not track** users or set analytics cookies;
- **mirrors all query state in the URL**, so any search is a permalink
  you can share.

## Features

- 🧑‍🎓 **Student directory** — paginated, sortable search over the
  2024-28 admitted cohort with name, roll-number, course, scheme, and
  batch filters; CSV export; faceted breakdown of results.
- 📅 **Timetable** — look up any student by roll, name, or section
  code to see their **core + PE1 + PE2** weekly schedule side-by-side,
  with the current day highlighted.
- 📚 **Previous-year questions (PYQs)** — metadata-driven lookup of
  past papers and scanned pages with PDF downloads.
- 📖 **Books archive** — search box stub awaiting catalog integration.
- 🧮 **GPA calculator** — placeholder for upcoming grade schema.
- 🎓 **Courses** — placeholder for curated free courses and
  certifications.
- 🌗 **Light / dark theme** — toggle in the topbar, persisted via a
  signed session cookie.
- 🔗 **Shareable URLs** — every filter combination is reflected in the
  query string.
- ⬇️ **CSV export** for the filtered student list.

## Project Structure

```
kiit-archive/
├── app.py                  # Flask app factory + blueprint registry
├── requirements.txt        # flask, tabula-py
├── tabs/                   # one Blueprint per "page"
│   ├── __init__.py
│   ├── home.py
│   ├── students.py         # Query dataclass + data loaders + filters
│   ├── pyqs.py             # PYQ metadata lookup + download routes
│   ├── books.py
│   ├── gpa_calc.py
│   ├── courses.py
│   └── terms.py
├── templates/              # Jinja2 templates
│   ├── base.html           # topbar nav + theme toggle
│   ├── home.html
│   ├── students.html       # filter form + chips + pagination + facets
│   ├── pyqs.html
│   ├── books.html
│   ├── terms.html
│   ├── placeholder.html    # shared by stub pages
│   └── 404.html
├── static/
│   └── style.css           # design system, dark-theme overrides
├── students/               # 2024students.csv + per-section CSVs
├── pyqs/                   # papers + subjects.json + pyqs.json (when populated)
├── timetable/              # 5th-semester XLSX data (core + elective)
│   ├── Section detail_5th.xlsx
│   └── 5th_Semester_timetable_core_elective_student.xlsx
└── books/                  # reserved for future catalog
```

The original Streamlit project lives in `backup_streamlit/` (gitignored)
for reference only.

## Quick Start

Requires **Python 3.10+**.

```bash
# 1. Clone
git clone https://github.com/0xPolybit/kiit-archive.git
cd kiit-archive

# 2. Create a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the dev server
python app.py
```

The app starts on `http://localhost:5000` by default.

## Deploy to Render

The repo is ready to ship with a [Render Blueprint](https://render.com/docs/blueprint-spec).

1. Sign in to [render.com](https://render.com) with your GitHub account.
2. Click **New → Blueprint**, point it at `0xPolybit/kiit-archive`.
3. Render reads [`render.yaml`](render.yaml) and creates the `kiit-archive`
   web service. It will:
   - pin Python to the version in [`runtime.txt`](runtime.txt),
   - install deps from `requirements.txt`,
   - run [`Procfile`](Procfile) under gunicorn,
   - generate a secure `KIIT_ARCHIVE_SECRET` for you.
4. After the first deploy, every push to `main` triggers an auto-deploy.

Manual deploy (without the blueprint):

| Setting | Value |
| --- | --- |
| Runtime | Python |
| Build command | `pip install --upgrade pip && pip install -r requirements.txt` |
| Start command | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| Health check path | `/` |
| Env var `PYTHONUNBUFFERED` | `true` |
| Env var `KIIT_ARCHIVE_SECRET` | a random 32-byte hex string |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Port the dev server binds to |
| `RENDER` | _(unset)_ | When set, `python app.py` runs without debug |
| `DYNO` | _(unset)_ | Same as `RENDER`, for Heroku compatibility |
| `KIIT_ARCHIVE_SECRET` | `dev-only-change-me` | Flask session signing key — **set this in production** |

Example (local production-like run):

```bash
export PORT=8080
export KIIT_ARCHIVE_SECRET="$(python -c 'import secrets; print(secrets.token_hex(32))')"
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

## Usage

### Students

Navigate to `/students/`. The page accepts the following query
parameters (all optional):

| Param | Values | Notes |
| --- | --- | --- |
| `course` | full course name, or `Anything` | |
| `q` | substring | case-insensitive name match |
| `roll` | substring | case-insensitive roll-number match |
| `scheme` | `A`, `B`, `both` | fixed; the broken legacy filter has been corrected |
| `batch` | `0`–`33` | `0` means *all batches* |
| `sort` | `roll`, `name`, `course`, `section` | |
| `dir` | `asc`, `desc` | |
| `page` | integer ≥ 1 | |
| `size` | `25`, `50`, `100` | results per page |

Hit **Export N rows as CSV** at the bottom of the form to download the
full filtered result set (pagination ignored).

### Previous-Year Questions

`/pyqs/` reads two JSON files (currently absent in this repo):

- `pyqs/subjects.json` — list of subjects per semester.
- `pyqs/pyqs.json` — one record per uploaded paper.

Each paper record looks like:

```json
{
  "academic-year": "2024-25",
  "subject-code": "MA11001 — Engineering Mathematics-I",
  "exam": "Mid Semester (Autumn)",
  "semester": 1,
  "file": "2024 Autumn Midsem MA11001 24052392",
  "credit": "shared by @example"
}
```

PDFs and scanned JPGs in `pyqs/` whose filename starts with the
`file` value are picked up automatically and exposed at
`/pyqs/download/<file>` and `/pyqs/image/<file>`.

### Books

`/books/` is a search box that mirrors the query into the URL via
`?query=`. The actual catalog is still being prepared.

### GPA Calculator

`/gpa-calculator/` is a placeholder for the upcoming grade schema.
Contributions welcome — see [Contributing](#contributing).

### Courses

`/courses/` will eventually list free courses and certifications
recommended for KIIT students.

### Terms

`/terms/` is a static page describing the project's terms of use.

## Adding Data

### Students

1. Edit `students/2024students.csv` with three columns:
   `roll,name,section`.
2. Section must be of the form `A01`..`A33` or `B01`..`B33`.
3. Roll-number digits 3-4 must map to an entry in `COURSE_CODES` in
   `tabs/students.py` (keys `"00"`..`"30"`).

Reload `/students/` to see the new data.

### Previous-Year Questions

1. Drop the PDF into `pyqs/`. Name it
   `<year> <season> <exam> <subject-code> <roll>.pdf` (no spaces
   would be safer).
2. Drop scanned page JPGs next to it with the same prefix and a
   numeric suffix (`_1.jpg`, `_2.jpg`, …).
3. Add one entry per paper to `pyqs/pyqs.json`.
4. Add the subject to `pyqs/subjects.json` under the right semester.

## Contributing

Issues and pull requests are welcome.

1. Fork the repo and create a feature branch.
2. Make your change. Match the surrounding code style:
   - Type hints for new functions.
   - Docstrings on every public function and route.
   - Jinja templates use the existing `base.html` blocks.
3. Run the smoke tests below before pushing.
4. Open a PR describing the change.

Smoke test (no extra dependencies required):

```python
from app import app
client = app.test_client()
assert client.get("/").status_code == 200
assert client.get("/students/").status_code == 200
assert client.get("/students/?scheme=A").status_code == 200
assert client.get("/students/export?scheme=A").status_code == 200
assert client.get("/pyqs/").status_code == 200
assert client.get("/does-not-exist").status_code == 404
```

## Roadmap

- [ ] Books catalog integration (ISBN lookup or curated list).
- [ ] GPA calculator with the official KIIT grading scale.
- [ ] Free-courses page with curated links per branch.
- [ ] Multi-cohort support beyond 2024-28.
- [ ] SQLite-backed search index for larger datasets.
- [ ] Container image + deployment guide (Docker / Fly.io / Render).

## License

Released under the [MIT License](LICENSE). You are free to use, modify,
and redistribute this project as long as the copyright and license
notice are preserved.

## Credits

- Built and maintained by [0xPolybit](https://github.com/0xPolybit).
- Data sourced from publicly available KIIT University documents.
- Material Symbols icons by Google.
- Inter font by Rasmus Andersson.

> "Public KIIT Archive — unofficial, but all data is provided by
> public KIIT University documents."