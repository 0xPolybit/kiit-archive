"""KIIT Archive — Flask entry point.

Replaces the previous Streamlit multi-page app. Each "tab" is now a
Flask blueprint under tabs/ rendered through Jinja2 templates under
templates/.
"""

import os

from flask import Flask, render_template

from tabs import (
    books_bp,
    courses_bp,
    gpa_calc_bp,
    home_bp,
    pyqs_bp,
    students_bp,
    terms_bp,
)


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")

    app.register_blueprint(home_bp)
    app.register_blueprint(students_bp, url_prefix="/students")
    app.register_blueprint(pyqs_bp, url_prefix="/pyqs")
    app.register_blueprint(books_bp, url_prefix="/books")
    app.register_blueprint(gpa_calc_bp, url_prefix="/gpa-calculator")
    app.register_blueprint(courses_bp, url_prefix="/courses")
    app.register_blueprint(terms_bp, url_prefix="/terms")

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("404.html"), 404

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)