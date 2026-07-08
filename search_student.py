import csv
import os
import glob

def search_students(query: str):
    query = query.strip().lower()
    results = []
    students_dir = os.path.join(os.path.dirname(__file__), "students")

    for section in (
        [f"A{i:02d}" for i in range(1, 34)] +
        [f"B{i:02d}" for i in range(1, 34)]
    ):
        filepath = os.path.join(students_dir, f"{section}.csv")
        if not os.path.exists(filepath):
            continue
        with open(filepath, newline="", encoding="utf-8") as f:
            for row in csv.reader(f):
                if len(row) < 2:
                    continue
                roll, name = row[0].strip(), row[1].strip()
                if query in name.lower():
                    results.append((section, roll, name))

    return results


if __name__ == "__main__":
    name = input("Enter student name to search: ").strip()
    if not name:
        print("No input provided.")
    else:
        matches = search_students(name)
        if not matches:
            print("No results found.")
        else:
            print(f"\nFound {len(matches)} result(s):\n")
            print(f"{'Section':<10} {'Roll No':<12} {'Name'}")
            print("-" * 40)
            for section, roll, student_name in matches:
                print(f"{section:<10} {roll:<12} {student_name}")
