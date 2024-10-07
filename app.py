import streamlit as st
import os

if os.name == 'nt':
    filediff = '\\'
else:
    filediff = '/'

home_page = st.Page(f"tabs{filediff}home.py", title="Home", icon=":material/home:")
students_page = st.Page(f"tabs{filediff}students.py", title="Students", icon=":material/person:")
pyqs_page = st.Page(f"tabs{filediff}pyqs.py", title="PYQs", icon=":material/archive:")
terms_page = st.Page(f"tabs{filediff}terms.py", title="Terms", icon=":material/list:")

pg = st.navigation([home_page, students_page, pyqs_page, terms_page])
st.set_page_config(page_title="KIIT Archive", page_icon=":material/archive:")
pg.run()