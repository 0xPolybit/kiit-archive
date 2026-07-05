"""Courses tab — placeholder for free courses / certifications list."""

from flask import Blueprint, render_template

courses_bp = Blueprint("courses", __name__)


@courses_bp.route("/", methods=["GET"])
def index():
    return render_template("placeholder.html",
                           title="Courses",
                           caption="View the top free courses and certifications students can enroll to.")