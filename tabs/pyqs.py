import streamlit as st
import os
import re

def get_substr(string):
    return string[-8:-1]

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
    "Chemistry [CH10001]",
    "Basic Civil Engineering [CE10001]",
    "Basic Mechanical Engineering [ME10003]",
    "Elements of Machine Learning [EE10001]",
    "Bio Medical Engineering [EC10003]",
    "Nano Science [CH10005]",
    "Smart Materials [PH10003]",
    "Molecular Diagonistics [LS10003]",
    "Science of Public Health [PE10002]",
    "Society, Science and Technology [HS10013]",
    "Community/Environment Based Project [EX17001]",
    "Essentials of Management [HS10202]"
]
course_codes.sort(key=get_substr)

st.title("PYQs Archive")

st.caption("We only contain examination data since the 2024-25 academic year.")

st.subheader("Filters")

col1, col2, col3 = st.columns(3)
with col1:
    year_options = st.selectbox("Select Academic Year", ("2024-25"), index=0)
with col2:
    semester_options = st.selectbox("Select Semester", ("Semester 1"), index=0)
course_options = year_options + " " + semester_options
with col3:
    if int(course_options[-1]) % 2 == 0:
        exam_options = st.selectbox("Select Exam", ("Mid Semester (Spring)", "End Semester (Summer)"), index=0)
    else:
        exam_options = st.selectbox("Select Exam", ("Mid Semester (Autumn)", "End Semester (Winter)"), index=0)
subject_options = st.selectbox("Select Subject", course_codes, index=0)
do_it = st.button("Search for PYQ")

if do_it:
    pdf_file = None
    credits = ""
    jpg_files = []
    files = [f for f in os.listdir("pyqs") if os.path.isfile(os.path.join("pyqs", f))]
    for file in files:
        if (subject_options[-8:-1] in file) and (exam_options[0:3] in file) and (course_options[0:4] in file):
            if file.endswith(".pdf"):
                pdf_file = file
                credits = file[-12:-4]
            elif file.endswith(".jpg"):
                jpg_files.append(file)
    if pdf_file is None or len(jpg_files) == 0:
        st.error("Oops! Looks like we do not have that specific PYQ yet.")
    else:
        st.subheader("Results")
        jpg_files.sort()
        col3, col4 = st.columns(2)
        with col3:
            for jpg_file in jpg_files:
                st.image(f"pyqs/{jpg_file}", caption=f"Page {jpg_file[-5:-4]}", use_column_width=True)
        with col4:
            st.markdown("**PDF File:** " + pdf_file)
            st.download_button(label="Download PDF", data=open(f"pyqs/{pdf_file}", "rb").read(), file_name=pdf_file)
            st.markdown("**Credits to who shared this:** " + credits)