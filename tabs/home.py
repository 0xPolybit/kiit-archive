import streamlit as st

st.title("Public KIIT Archive*")

st.caption("*Unofficial, but all data is provided by public KIIT University documents.")

col1, col2, col3 = st.columns(3)

with col1:
    st.page_link("tabs/students.py", label="Students", icon=":material/person:")
    st.write("Search and filter for publicly available data on students.")
with col2:
    st.page_link("tabs/terms.py", label="Terms", icon=":material/list:")
    st.write("Terms and Conditions for this website.")