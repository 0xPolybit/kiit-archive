"""Students tab — search and filter the 2024-25 admitted-student CSV.

Logic mirrors the Streamlit implementation: course code prefix (digits 2-3
of the roll number) maps to a B.Tech program, section letter maps to the
class scheme (A/B), trailing digits map to the class batch.
"""

import csv
import os

from flask import Blueprint, current_app, render_template, request

students_bp = Blueprint("students", __name__)


COURSE_CODES = {
    "00": "Anything",
    "01": "B.Tech in Civil Engineering",
    "02": "B.Tech in Mechanical Engineering",
    "03": "B.Tech in Electrical Engineering",
    "04": "B.Tech in Electronics & Telecommunications",
    "05": "B.Tech in Computer Science and Engineering",
    "06": "B.Tech in Information Technology",
    "07": "B.Tech in Electronics & Electrical Engineering",
    "08": "B.Tech in [N/A]",
    "09": "B.Tech in Mechanical (Automobile) Engineering",
    "10": "B.Tech in [N/A]",
    "11": "B.Tech in [N/A]",
    "12": "B.Tech in [N/A]",
    "13": "B.Tech in [N/A]",
    "14": "B.Tech in [N/A]",
    "15": "B.Tech in Computer Science & Engineering (AL/ML)",
    "16": "B.Tech in [N/A]",
    "17": "B.Tech in [N/A]",
    "18": "B.Tech in [N/A]",
    "19": "B.Tech in [N/A]",
    "20": "B.Tech in [N/A]",
    "21": "B.Tech in [N/A]",
    "22": "B.Tech in [N/A]",
    "23": "B.Tech in [N/A]",
    "24": "B.Tech in Chemical Technology",
    "25": "B.Arch in Architecture",
    "26": "B.Tech in Mechatronics Engineering",
    "27": "B.Tech in Aerospace Engineering",
    "28": "B.Tech in Computer Science and Systems Engineering",
    "29": "B.Tech in Computer Science and Communications",
    "30": "B.Tech in Electronics and Computer Science",
}

YEAR_OPTIONS = ["2024-25"]
SCHEME_OPTIONS = ["Both A and B", "A", "B"]
COURSE_CHOICES = [c for c in COURSE_CODES.values() if c != "B.Tech in [N/A]"]


def _filter_students(year: str, course: str, name: str, scheme: str, batch: int) -> list[dict]:
    csv_path = os.path.join(
        current_app.root_path, "students", f"{year[0:4]}students.csv"
    )
    if not os.path.exists(csv_path):
        return []

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if not row or len(row) < 3:
                continue
            if name.strip() not in row[1]:
                continue
            if course != "Anything" and COURSE_CODES.get(row[0][2:4]) != course:
                continue
            if scheme != "Both A and B" and scheme != row[2][0]:
                continue
            if batch != 0 and batch != int(row[2].strip()[1:]):
                continue
            rows.append({
                "Roll Number": row[0],
                "Student Name": row[1],
                "Section": row[2],
                "Course": COURSE_CODES.get(row[0][2:4], "B.Tech in [N/A]"),
            })
    return rows


@students_bp.route("/", methods=["GET"])
def index():
    year = request.args.get("year", YEAR_OPTIONS[0])
    course = request.args.get("course", "B.Tech in Computer Science and Engineering")
    name = request.args.get("name", "")
    scheme = request.args.get("scheme", SCHEME_OPTIONS[0])
    try:
        batch = int(request.args.get("batch", "1"))
    except ValueError:
        batch = 1

    searched = any(k in request.args for k in ("year", "course", "name", "scheme", "batch", "do"))
    rows: list[dict] = []
    if searched:
        rows = _filter_students(year, course, name, scheme, batch)

    return render_template(
        "students.html",
        year_options=YEAR_OPTIONS,
        course_choices=COURSE_CHOICES,
        scheme_options=SCHEME_OPTIONS,
        form={
            "year": year,
            "course": course,
            "name": name,
            "scheme": scheme,
            "batch": batch,
        },
        rows=rows,
        searched=searched,
    )