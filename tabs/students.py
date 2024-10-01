import streamlit as st
import csv

course_codes = {
    "00": "Anything",
    "01": "B.Tech in Civil Engineering",
    "02": "B.Tech in Mechanical Engineering",
    "03": "B.Tech in Electrical Engineering",
    "04": "B.Tech in Electronics & Telecommunications",
    "05": "B.Tech in Computer Science and Engineering",
    "06": "B.Tech in Information Technology",
    "07": "B.Tech in Electronics & Electrical Engineering",
    "08": "B.Tech in [N/A]",
    "09": "B.Tech in Mechanical (Automobile) Engineering",
    "10": "B.Tech in [N/A]",
    "11": "B.Tech in [N/A]",
    "12": "B.Tech in [N/A]",
    "13": "B.Tech in [N/A]",
    "14": "B.Tech in [N/A]",
    "15": "B.Tech in [N/A]",
    "16": "B.Tech in [N/A]",
    "17": "B.Tech in [N/A]",
    "18": "B.Tech in [N/A]",
    "19": "B.Tech in [N/A]",
    "20": "B.Tech in [N/A]",
    "21": "B.Tech in [N/A]",
    "22": "B.Tech in [N/A]",
    "23": "B.Tech in [N/A]",
    "24": "B.Tech in Chemical Technology",
    "25": "B.Arch in Architecture",
    "26": "B.Tech in Mechatronics Engineering",
    "27": "B.Tech in Aerospace Engineering",
    "28": "B.Tech in Computer Science and Systems Engineering",
    "29": "B.Tech in Computer Science and Communications",
    "30": "B.Tech in Electronics and Computer Science",
}

st.title("KIIT Search-able Archive")

st.caption("We only contain student data of 2024-25 admitted students.")

st.subheader("Filters")

course_options = st.selectbox("Select Course", (course for course in list(course_codes.values()) if course != 'B.Tech in [N/A]'), index=5)
name_filter = st.text_input("Name Filter", "")
col1, col2 = st.columns(2)
with col1:
    scheme_options = st.selectbox("Select Scheme", ("Both A and B", "A", "B"), index=0)
with col2:
    class_options = st.number_input("Select Class", min_value=1, max_value=33, value=1, step=1)
do_it = st.button("Search Students")

if do_it:
    with open('2024students.csv', 'r') as f:
        reader = csv.reader(f)
        data = { "Roll Number": [], "Student Name": [], "Section": [], "Course": [] }
        for row in reader:
            if name_filter.strip() in row[1]:
                if course_options == 'Anything' or (course_codes.get(row[0][2:4]) == course_options):
                    if scheme_options == 'Both A and B' or (scheme_options == row[2][0]):
                        if class_options == int(row[2].strip()[1:]):
                            data["Roll Number"].append(row[0])
                            data["Student Name"].append(row[1])
                            data["Section"].append(row[2])
                            data["Course"].append(course_codes.get(row[0][2:4]))
    st.dataframe(data, use_container_width=True)
else:
    st.info("Make sure to be as specific as you can be.")