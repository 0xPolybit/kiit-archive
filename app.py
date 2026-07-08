"""KIIT Archive — Flask entry point.

Replaces the previous Streamlit multi-page app. Each "tab" is now a
Flask blueprint under tabs/ rendered through Jinja2 templates under
templates/.
"""

import os

from flask import Flask, redirect, render_template, request, session, url_for

from tabs import (
    books_bp,
    courses_bp,
    gpa_calc_bp,
    home_bp,
    pyqs_bp,
    students_bp,
    terms_bp,
    timetable_bp,
)


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")

    # Required for session cookies — used to persist the theme choice
    # across visits. Falls back to a stable dev key if not set.
    app.config["SECRET_KEY"] = os.environ.get(
        "KIIT_ARCHIVE_SECRET", "dev-only-change-me"
    )

    app.register_blueprint(home_bp)
    app.register_blueprint(students_bp, url_prefix="/students")
    app.register_blueprint(pyqs_bp, url_prefix="/pyqs")
    app.register_blueprint(books_bp, url_prefix="/books")
    app.register_blueprint(gpa_calc_bp, url_prefix="/gpa-calculator")
    app.register_blueprint(courses_bp, url_prefix="/courses")
    app.register_blueprint(terms_bp, url_prefix="/terms")
    app.register_blueprint(timetable_bp, url_prefix="/timetable")

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("404.html"), 404

    @app.route("/theme/toggle", methods=["POST", "GET"])
    def theme_toggle():
        # Flip the current theme. Falls back to "dark" when the user is
        # currently on light, so the button always leads somewhere new.
        current = session.get("theme", "light")
        session["theme"] = "dark" if current == "light" else "light"
        # Send the visitor back to where they clicked from.
        next_url = request.args.get("next") or request.referrer or url_for("home.index")
        # Only allow same-origin redirects to avoid open-redirect surprises.
        if not next_url.startswith("/"):
            next_url = url_for("home.index")
        return redirect(next_url)

    @app.context_processor
    def inject_theme():
        return {"theme": session.get("theme", "light")}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)