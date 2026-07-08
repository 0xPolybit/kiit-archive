"""Home tab — landing page with quick links to every section."""

from flask import Blueprint, render_template

home_bp = Blueprint("home", __name__)


CARDS = [
    ("students.index", "person", "Students",
     "Search and filter for publicly available data on students."),
    ("timetable.index", "today", "Timetable",
     "Look up any student by roll, name, or section to see their weekly timetable."),
    ("pyqs.index", "archive", "PYQs",
     "Search and filter for publicly available PYQs."),
    ("books.index", "menu_book", "Books",
     "Search and filter for publicly available books."),
    ("gpa_calc.index", "calculate", "GPA Calculator",
     "Calculate your class GPA with ease."),
    ("courses.index", "school", "Courses",
     "View the top free courses and certifications students can enroll to."),
    ("terms.index", "list", "Terms",
     "Terms and Conditions for this website."),
]


@home_bp.route("/")
def index():
    return render_template("home.html", cards=CARDS)