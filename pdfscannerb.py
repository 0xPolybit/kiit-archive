import tabula

scheme = 'B'

for j in range(1, 34):
    tables = tabula.read_pdf('2024-28 Student List\\' + scheme + '{:02d}'.format(j) + '.pdf', pages='all')
    full_data = ''
    for i, table in enumerate(tables, start=1):
        if (j == 29 or j == 31) and i == 3:
            continue
        table = table.iloc[1:]
        scuffed = False
        print(table.columns)
        if 'Sl Roll' in table.columns:
            table.rename( columns={'Sl Roll':'Roll Number'}, inplace=True )
        if 'HASS ElectiveStudents Name Section' in table.columns:
            table.rename( columns={'HASS ElectiveStudents Name Section':'Students Name'}, inplace=True )
            scuffed = True
        for index, row in table.iterrows():
            roll_no = str(row['Roll Number']).split(' ')[-1]
            name = ' '.join(str(row['Students Name']).title().replace('  ', ' ').split()).replace(scheme + '{:02d}'.format(j), '')
            # name = name.split('Name')[2].strip() if scuffed else name
            full_data += roll_no + ", " + name + '\n'
        print(full_data)
    with open('2024students\\' + scheme + '{:02d}'.format(j) + '.csv', 'w') as f:
        f.write(full_data)