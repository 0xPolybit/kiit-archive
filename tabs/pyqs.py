import streamlit as st
import os
import re

course_codes = [
    "Creativity, Innovation and Entrepreneurship [PS10045]",
    "Physics [PH10001]",
    "Differential Equations and Linear Algebra [MA11001]",
    "Optimization Technique [MA10003]",
    "Science of Living System [LS10001]",
    "English [HS10001]",
    "Basic Instrumentation [EE10003]",
    "Basic Electrical Engineering [EE10002]",
    "Basic Electronics [EC10001]",
    "Environmental Sciences [CH10003]",
    "Chemistry [CH10001]"

]

st.title("PYQs Archive")

st.subheader("Filters")

course_options = st.selectbox("Select Semester", ("2024 Semester 1"), index=0)
if int(course_options[-1]) % 2 == 0:
    exam_options = st.selectbox("Select Exam", ("Mid Semester (Spring)", "End Semester (Summer)"), index=0)
else:
    exam_options = st.selectbox("Select Exam", ("Mid Semester (Autumn)", "End Semester (Winter)"), index=0)
subject_options = st.selectbox("Select Subject", course_codes, index=2)
do_it = st.button("Search PYQs")

if do_it:
    pdf_file = None
    credits = ""
    jpg_file = None
    files = [f for f in os.listdir("pyqs") if os.path.isfile(os.path.join("pyqs", f))]
    for file in files:
        if (subject_options[-8:-1] in file) and (exam_options[0:3] in file) and (course_options[0:4] in file):
            if file.endswith(".pdf"):
                pdf_file = file
                credits = file[-12:-4]
            elif file.endswith(".jpg"):
                jpg_file = file
    if pdf_file is None or jpg_file is None:
        st.error("Oops! Looks like we do not have that specific PYQ yet.")
    else:
        st.image(f"pyqs/{jpg_file}", use_column_width=True)
        st.download_button(label="Download PDF", data=open(f"pyqs/{pdf_file}", "rb").read(), file_name=pdf_file)
        st.markdown("Generosity Credits: " + credits)