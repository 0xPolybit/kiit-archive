"""PYQs tab — locate a past-year paper PDF and its scanned pages.

The lookup is metadata-driven: `pyqs/subjects.json` lists subjects per
semester; `pyqs/pyqs.json` holds one record per uploaded paper with a
file-code prefix that is used to glob the actual PDF + JPGs from the
pyqs/ directory.
"""

import glob
import json
import os

from flask import Blueprint, abort, current_app, render_template, request, send_file, url_for

pyqs_bp = Blueprint("pyqs", __name__)


YEAR_OPTIONS = ["2024-25"]
SEMESTER_OPTIONS = ["Semester 1", "Semester 2"]
CONTRIBUTE_URL = (
    "https://docs.google.com/forms/d/e/1FAIpQLSfELG83aiBPhSVmuKrq6JtwhVl0eM4wEmp0PquhlD2wAklTPw/viewform"
    "?usp=sf_link"
)


def _exam_options_for(semester_index: int) -> list[str]:
    # Semester 1 (Autumn) and Semester 2 (Spring) get the matching
    # mid/end-semester names. The Streamlit version key off semester
    # number, so do we.
    if semester_index % 2 == 0:
        return ["Mid Semester (Spring)", "End Semester (Summer)"]
    return ["Mid Semester (Autumn)", "End Semester (Winter)"]


def _get_substr(string: str) -> str:
    # Same comparator the Streamlit tab uses to sort subjects.
    return string[-8:-1]


def _load_subjects(semester_index: int) -> list[str]:
    path = os.path.join(current_app.root_path, "pyqs", "subjects.json")
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    subjects = data[semester_index - 1]
    subjects.sort(key=_get_substr)
    return subjects


def _load_pyqs() -> list[dict]:
    path = os.path.join(current_app.root_path, "pyqs", "pyqs.json")
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _find_pyq(pyqs, year, subject, exam, semester_index):
    for pyq in pyqs:
        if (
            pyq.get("academic-year") == year
            and subject in pyq.get("subject-code", "")
            and pyq.get("exam") == exam
            and pyq.get("semester") == semester_index
        ):
            return pyq
    return None


@pyqs_bp.route("/", methods=["GET"])
def index():
    year = request.args.get("year", YEAR_OPTIONS[0])
    semester = request.args.get("semester", SEMESTER_OPTIONS[0])
    semester_index = int(semester[-1])
    exam = request.args.get("exam", _exam_options_for(semester_index)[0])

    subjects = _load_subjects(semester_index)
    subject = request.args.get("subject") or (subjects[0] if subjects else "")

    result = None
    error = None
    pdf_url = None
    pages = []
    credits = None

    if request.args.get("do") and subject:
        pyqs = _load_pyqs()
        match = _find_pyq(pyqs, year, subject, exam, semester_index)
        if not match:
            error = "missing"
        else:
            file_code = match["file"]
            credits = match.get("credit", "anonymous")
            files = glob.glob(os.path.join(current_app.root_path, "pyqs", f"{file_code}*"))
            pdf_file = next((f for f in files if f.endswith(".pdf")), None)
            pages = sorted(f for f in files if f.endswith(".jpg"))
            if not pdf_file or not pages:
                error = "missing"
            else:
                pdf_url = url_for("pyqs.download", code=os.path.basename(pdf_file))
                result = {"subject": subject, "exam": exam, "credits": credits}

    return render_template(
        "pyqs.html",
        year_options=YEAR_OPTIONS,
        semester_options=SEMESTER_OPTIONS,
        exam_options=_exam_options_for(semester_index),
        subjects=subjects,
        form={
            "year": year,
            "semester": semester,
            "exam": exam,
            "subject": subject,
        },
        result=result,
        pages=pages,
        pdf_url=pdf_url,
        credits=credits,
        error=error,
        contribute_url=CONTRIBUTE_URL,
    )


def _safe_under_pyqs(filename: str) -> str | None:
    # Disallow path traversal — only allow simple basenames.
    if "/" in filename or "\\" in filename or filename.startswith("."):
        return None
    path = os.path.join(current_app.root_path, "pyqs", filename)
    if not os.path.isfile(path):
        return None
    return path


@pyqs_bp.route("/download/<path:code>")
def download(code):
    path = _safe_under_pyqs(code)
    if path is None or not path.lower().endswith(".pdf"):
        abort(404)
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))


@pyqs_bp.route("/image/<path:filename>")
def image(filename):
    path = _safe_under_pyqs(filename)
    if path is None or not path.lower().endswith(".jpg"):
        abort(404)
    return send_file(path, mimetype="image/jpeg")