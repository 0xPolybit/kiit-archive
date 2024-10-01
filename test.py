all_data = ''

for i in range(1, 34):
    with open('2024students/A{:02d}.csv'.format(i), 'r') as f:
        data = f.read()
        all_data += data.replace('\n', ', A{:02d}\n'.format(i))
    with open('2024students/B{:02d}.csv'.format(i), 'r') as f:
        data = f.read()
        all_data += data.replace('\n', ', B{:02d}\n'.format(i))

with open('2024students.csv', 'w') as f:
    f.write(all_data)