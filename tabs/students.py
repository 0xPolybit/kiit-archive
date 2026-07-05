"""Students tab — search and filter the 2024-28 admitted-student CSV.

The data sits in students/<year>students.csv with one row per student:
    roll, name, section
where section looks like " A01" or " B17" — leading whitespace plus a
scheme letter and a zero-padded batch number.

The page exposes:
  GET /students/         — form + results (paginated)
  GET /students/export   — same filters, returns CSV of every match
"""

import csv
import io
import os
from dataclasses import asdict, dataclass
from typing import Iterable

from flask import (
    Blueprint,
    Response,
    current_app,
    render_template,
    request,
)

students_bp = Blueprint("students", __name__)


# --- Reference data --------------------------------------------------------

COURSE_CODES: dict[str, str] = {
    "00": "Anything",
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
}

YEAR_OPTIONS: list[str] = ["2024-28"]
SCHEME_OPTIONS: list[str] = ["both", "A", "B"]
PAGE_SIZES: list[int] = [25, 50, 100]
SORT_KEYS: dict[str, str] = {
    "roll": "Roll Number",
    "name": "Student Name",
    "course": "Course",
    "section": "Section",
}
COURSE_CHOICES: list[str] = sorted(
    {c for c in COURSE_CODES.values() if c != "Anything"}
)


# --- Data layer ------------------------------------------------------------

@dataclass(frozen=True)
class Student:
    roll: str
    name: str
    scheme: str   # "A" or "B"
    batch: int    # 1..33
    section: str  # e.g., "A01"
    course: str   # full course name

    @property
    def dict(self) -> dict:
        return {
            "Roll Number": self.roll,
            "Student Name": self.name,
            "Section": self.section,
            "Course": self.course,
        }


@dataclass
class Query:
    """A parsed query against the student list.

    Defaults match the home-page experience: 2024-28 cohort, no filters,
    sorted by roll number ascending.
    """

    year: str = "2024-28"
    course: str = "Anything"
    q: str = ""               # name contains (case-insensitive)
    roll: str = ""            # roll number contains
    scheme: str = "both"      # "A" / "B" / "both"
    batch: int = 0            # 0 = all batches
    sort: str = "roll"        # one of SORT_KEYS
    direction: str = "asc"    # "asc" or "desc"
    page: int = 1             # 1-indexed
    page_size: int = 25

    def to_params(self) -> dict[str, str]:
        """Round-trip-friendly representation for hidden inputs and links."""
        d = asdict(self)
        return {k: str(v) for k, v in d.items() if v not in ("", 0, "Anything", "both", "roll", "asc", 1, 25)}

    @property
    def is_filtered(self) -> bool:
        return any([
            self.course != "Anything",
            bool(self.q.strip()),
            bool(self.roll.strip()),
            self.scheme != "both",
            self.batch != 0,
        ])

    @property
    def active_chips(self) -> list[tuple[str, str, str]]:
        """Render-ready list of (label, value, param_to_clear)."""
        chips: list[tuple[str, str, str]] = []
        if self.course != "Anything":
            chips.append(("Course", self.course, "course"))
        if self.q.strip():
            chips.append(("Name", self.q.strip(), "q"))
        if self.roll.strip():
            chips.append(("Roll", self.roll.strip(), "roll"))
        if self.scheme != "both":
            chips.append(("Scheme", self.scheme, "scheme"))
        if self.batch != 0:
            chips.append(("Batch", f"{self.batch:02d}", "batch"))
        return chips


def _coerce_int(raw: str | None, default: int, lo: int, hi: int) -> int:
    if raw is None:
        return default
    try:
        v = int(raw)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


def _coerce_int_choice(raw: str | None, default: int, choices: Iterable[int]) -> int:
    """Coerce to one of `choices`; fall back to `default` if not in the set."""
    try:
        v = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        return default
    return v if v in set(choices) else default


def _coerce_str(raw: str | None, default: str, allowed: Iterable[str]) -> str:
    if raw is None:
        return default
    return raw if raw in allowed else default


def _parse_query() -> Query:
    args = request.args
    return Query(
        year=_coerce_str(args.get("year"), "2024-28", YEAR_OPTIONS),
        course=_coerce_str(args.get("course"), "Anything", COURSE_CODES.values()),
        q=(args.get("q") or "").strip(),
        roll=(args.get("roll") or "").strip(),
        scheme=_coerce_str(args.get("scheme"), "both", SCHEME_OPTIONS),
        batch=_coerce_int(args.get("batch"), 0, 0, 33),
        sort=_coerce_str(args.get("sort"), "roll", SORT_KEYS.keys()),
        direction=_coerce_str(args.get("dir"), "asc", ("asc", "desc")),
        page=_coerce_int(args.get("page"), 1, 1, 10_000),
        page_size=_coerce_int_choice(args.get("size"), 25, PAGE_SIZES),
    )


def _csv_path(year: str) -> str:
    return os.path.join(current_app.root_path, "students", f"{year[0:4]}students.csv")


def _load_students(year: str) -> list[Student]:
    path = _csv_path(year)
    if not os.path.exists(path):
        return []

    students: list[Student] = []
    with open(path, newline="", encoding="utf-8") as f:
        for raw in csv.reader(f):
            if len(raw) < 3:
                continue
            roll = raw[0].strip()
            name = raw[1].strip()
            section_raw = raw[2].strip()
            if not (roll and name and section_raw):
                continue
            scheme = section_raw[0].upper()
            if scheme not in ("A", "B"):
                continue
            try:
                batch = int(section_raw[1:])
            except ValueError:
                continue
            course = COURSE_CODES.get(roll[2:4], "B.Tech in [N/A]")
            students.append(
                Student(
                    roll=roll,
                    name=name,
                    scheme=scheme,
                    batch=batch,
                    section=f"{scheme}{batch:02d}",
                    course=course,
                )
            )
    return students


# --- Query layer -----------------------------------------------------------

def _apply_filters(students: list[Student], q: Query) -> list[Student]:
    name_q = q.q.lower()
    roll_q = q.roll.lower()
    out = []
    for s in students:
        if name_q and name_q not in s.name.lower():
            continue
        if roll_q and roll_q not in s.roll.lower():
            continue
        if q.course != "Anything" and s.course != q.course:
            continue
        if q.scheme != "both" and s.scheme != q.scheme:
            continue
        if q.batch != 0 and s.batch != q.batch:
            continue
        out.append(s)
    return out


def _sort_students(students: list[Student], q: Query) -> list[Student]:
    key = SORT_KEYS[q.sort]
    reverse = q.direction == "desc"

    def sort_key(s: Student):
        if key == "Roll Number":
            # Natural sort by integer roll, with string fallback for safety.
            try:
                return (0, int(s.roll), "")
            except ValueError:
                return (1, 0, s.roll)
        if key == "Student Name":
            return s.name.lower()
        if key == "Course":
            return (s.course.lower(), s.roll)
        if key == "Section":
            return (s.scheme, s.batch, s.roll)
        return s.roll

    return sorted(students, key=sort_key, reverse=reverse)


def _facets(students: list[Student]) -> dict[str, list[tuple[str, int]]]:
    """Counts per course and per (scheme, batch)."""
    by_course: dict[str, int] = {}
    by_section: dict[str, int] = {}
    for s in students:
        by_course[s.course] = by_course.get(s.course, 0) + 1
        by_section[s.section] = by_section.get(s.section, 0) + 1
    return {
        "course": sorted(by_course.items(), key=lambda kv: (-kv[1], kv[0])),
        "section": sorted(by_section.items(), key=lambda kv: (kv[0][0], int(kv[0][1:]))),
    }


def _paginate(students: list[Student], page: int, page_size: int) -> tuple[list[Student], int, int]:
    total = len(students)
    pages = max(1, (total + page_size - 1) // page_size) if total else 1
    page = min(page, pages)
    start = (page - 1) * page_size
    return students[start : start + page_size], total, pages


def _run_query(students: list[Student], q: Query) -> dict:
    filtered = _apply_filters(students, q)
    facets = _facets(filtered)
    sorted_ = _sort_students(filtered, q)
    page_rows, total, pages = _paginate(sorted_, q.page, q.page_size)
    return {
        "rows": page_rows,
        "total": total,
        "pages": pages,
        "facets": facets,
    }


# --- Routes ----------------------------------------------------------------

@students_bp.route("/", methods=["GET"])
def index():
    students = _load_students(YEAR_OPTIONS[0])
    q = _parse_query()
    if q.is_filtered:
        result = _run_query(students, q)
    else:
        # No filters: don't run a search, but still show overall facets
        # so the user knows the dataset they could query.
        result = {"rows": [], "total": 0, "pages": 1, "facets": _facets(students)}

    return render_template(
        "students.html",
        form=asdict(q),
        is_filtered=q.is_filtered,
        rows=result["rows"],
        total=result["total"],
        pages=result["pages"],
        facets=result["facets"],
        page=q.page,
        size=q.page_size,
        active_chips=q.active_chips,
        student_count=len(students),
        scheme_options=SCHEME_OPTIONS,
        course_choices=COURSE_CHOICES,
        sort_keys=SORT_KEYS,
        page_sizes=PAGE_SIZES,
    )


@students_bp.route("/export")
def export():
    """Stream the filtered result set as CSV.

    Honors all the same filters as the index page, ignoring pagination
    and sort order so a download always contains every match.
    """
    students = _load_students(YEAR_OPTIONS[0])
    q = _parse_query()
    filtered = _apply_filters(students, q)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Roll Number", "Student Name", "Section", "Course"])
    for s in filtered:
        writer.writerow([s.roll, s.name, s.section, s.course])

    filename = f"kiit-archive-students-{q.year}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )