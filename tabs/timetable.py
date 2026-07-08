"""Timetable tab — find a student and show their weekly schedule.

The page joins three sources by roll number:

* the existing 2024-admitted students CSV  (name, scheme, batch, course)
* `Section detail_5th.xlsx`                (core section + PE1/PE2)
* `5th_Semester_timetable_core_elective_student.xlsx`  (weekly slots)

The query box accepts any of:
* a roll-number prefix or exact match,
* a name substring,
* a section code (e.g., "CS17") — returns every student in that section.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from flask import Blueprint, current_app, render_template, request

from tabs._timetable_data import (
    Slot,
    StudentInfo,
    all_known_rolls,
    days as data_days,
    find_students_by_name,
    get_student,
    has_section,
    periods as data_periods,
    rolls_in_section,
    schedule_for,
    section_for_roll,
    stats as data_stats,
    today_name,
)


timetable_bp = Blueprint("timetable", __name__)


@dataclass
class Match:
    student: Optional[StudentInfo]
    roll: str
    core_section: Optional[str]
    pe1_section: Optional[str]
    pe2_section: Optional[str]


@dataclass
class TimetableView:
    """Render-ready schedule for a section."""
    section: Optional[str]
    schedule: dict[str, list[Slot]]   # day → slots
    periods: list[tuple[str, str]]    # [(P1, 08:00), ...]
    days: list[str]
    today: str


def _schedule_for_section(app_root: str, section: Optional[str]) -> TimetableView:
    return TimetableView(
        section=section,
        schedule=schedule_for(app_root, section),
        periods=data_periods(app_root),
        days=data_days(app_root),
        today=today_name(),
    )


def _build_match(app_root: str, roll: str) -> Match:
    core, pe1, pe2 = section_for_roll(app_root, roll)
    return Match(
        student=get_student(app_root, roll),
        roll=roll,
        core_section=core,
        pe1_section=pe1,
        pe2_section=pe2,
    )


def _looks_like_roll(q: str) -> bool:
    return bool(q) and q[0].isdigit()


def _search(app_root: str, q: str) -> tuple[list[Match], str]:
    """Resolve a query string into a list of student matches.

    Returns (matches, note). `note` is non-empty when the result set was
    truncated or when the user should narrow their query.

    Heuristics, in order:
      1. Empty query → [].
      2. Starts with a digit and is at least 4 chars → exact roll, then
         prefix match across every roll we know about.
      3. Matches a known section code → every roll in that section.
      4. Otherwise treat as a name substring against the students CSV.
    """
    q = q.strip()
    if not q:
        return [], ""

    if _looks_like_roll(q) and len(q) >= 4:
        info = get_student(app_root, q)
        if info is not None:
            return [_build_match(app_root, q)], ""
        rolls = sorted(r for r in all_known_rolls(app_root) if r.startswith(q))
        if rolls:
            matches = [_build_match(app_root, r) for r in rolls[:25]]
            note = (f"Showing the first {len(matches)} of {len(rolls)} "
                    f"roll numbers starting with '{q}'. "
                    "Use a longer prefix to narrow the search."
                    if len(rolls) > len(matches) else "")
            return matches, note

    # Section-code lookup (e.g., "CS17", "IPA17", "BD1")
    if has_section(app_root, q):
        rolls = sorted(rolls_in_section(app_root, q))
        if rolls:
            matches = [_build_match(app_root, r) for r in rolls[:25]]
            note = (f"Showing the first {len(matches)} of {len(rolls)} "
                    f"students in section '{q.upper()}'. "
                    "Use the Students page to browse the full section."
                    if len(rolls) > len(matches) else "")
            return matches, note

    # Name substring
    all_name_matches = find_students_by_name(app_root, q, limit=10_000)
    total = len(all_name_matches)
    truncated = all_name_matches[:25]
    matches = [_build_match(app_root, s.roll) for s in truncated]
    note = (f"Showing the first {len(matches)} of {total} name matches. "
            "Use a more specific name to narrow the search."
            if total > 25 else "")
    return matches, note


# --- Routes ----------------------------------------------------------------

@timetable_bp.route("/", methods=["GET"])
def index():
    app_root = current_app.root_path
    q = request.args.get("q", "").strip()
    combine = request.args.get("combine", "").strip().lower() in ("1", "true", "yes")

    matches: list[Match] = []
    note = ""
    if q:
        matches, note = _search(app_root, q)

    match_views = []
    for m in matches:
        core = _schedule_for_section(app_root, m.core_section)
        pe1 = _schedule_for_section(app_root, m.pe1_section)
        pe2 = _schedule_for_section(app_root, m.pe2_section)
        # Order matches the split view: Core first, then PE1, PE2.
        sections = [
            ("Core", "core", core, m.core_section),
            ("PE1",  "pe1",  pe1,  m.pe1_section),
            ("PE2",  "pe2",  pe2,  m.pe2_section),
        ]
        match_views.append({
            "match": m,
            "core": core,
            "pe1": pe1,
            "pe2": pe2,
            "sections": sections,
        })

    return render_template(
        "timetable.html",
        q=q,
        combine=combine,
        note=note,
        today=today_name(),
        weekday_index=date.today().weekday(),
        matches=match_views,
        stats=data_stats(app_root),
        searched=bool(q),
    )