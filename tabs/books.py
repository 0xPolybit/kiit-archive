"""Books tab — placeholder for the textbooks archive.

The Streamlit version only carried a search box wired to the URL query
string, with the actual lookup left as a TODO. The Flask version keeps
the same surface: a search box that mirrors the query into the URL and
reports the query string back to the user.
"""

from flask import Blueprint, render_template, request

books_bp = Blueprint("books", __name__)


@books_bp.route("/", methods=["GET"])
def index():
    raw = request.args.get("query", "")
    query = raw.strip()
    return render_template(
        "books.html",
        query=query,
        searched=request.args.get("do") == "1",
    )