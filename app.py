import streamlit as st

home_page = st.Page("tabs/home.py", title="Home Page", icon=":material/home:")
students_page = st.Page("tabs/students.py", title="Students Page", icon=":material/person:")
terms_page = st.Page("tabs/terms.py", title="Terms Page", icon=":material/list:")

pg = st.navigation([home_page, students_page, terms_page])
st.set_page_config(page_title="KIIT Archive", page_icon=":material/archive:")
pg.run()