"""Terms tab — Terms & Conditions markdown."""

from flask import Blueprint, render_template

terms_bp = Blueprint("terms", __name__)


@terms_bp.route("/", methods=["GET"])
def index():
    return render_template("terms.html")