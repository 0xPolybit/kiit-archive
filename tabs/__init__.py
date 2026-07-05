"""Flask blueprints — one per Streamlit "tab".

Each blueprint exposes a single route (its index page) and renders a
Jinja2 template with the same content shape the Streamlit version
produced.
"""

from tabs.books import books_bp
from tabs.courses import courses_bp
from tabs.gpa_calc import gpa_calc_bp
from tabs.home import home_bp
from tabs.pyqs import pyqs_bp
from tabs.students import students_bp
from tabs.terms import terms_bp

__all__ = [
    "books_bp",
    "courses_bp",
    "gpa_calc_bp",
    "home_bp",
    "pyqs_bp",
    "students_bp",
    "terms_bp",
]