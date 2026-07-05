"""GPA Calculator tab — placeholder awaiting course/grade schema."""

from flask import Blueprint, render_template

gpa_calc_bp = Blueprint("gpa_calc", __name__)


@gpa_calc_bp.route("/", methods=["GET"])
def index():
    return render_template("placeholder.html",
                           title="GPA Calculator",
                           caption="We only contain examination data since the 2024-25 academic year.")