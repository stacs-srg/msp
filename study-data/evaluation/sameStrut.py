# Require indigo lib to be download 
# http://lifescience.opensource.epam.com/indigo/
from indigo import *
import csv

def compare(indigo, smile1, smile2):
    mol1 = indigo.loadMolecule(smile1)
    mol2 = indigo.loadMolecule(smile2)
    mol1.aromatize()
    mol2.aromatize()
    return mol1.canonicalSmiles() == mol2.canonicalSmiles()



indigo = Indigo()



with open('./final-data.csv','r') as csvinput:
    with open('./final-data-copy-2.csv', 'w') as csvoutput:
        
        writer = csv.writer(csvoutput, lineterminator='\n')
        newRows = []
        rows = csv.reader(csvinput)
        headings = rows.next()
        headings.append('correctly_drawn')
        newRows.append(headings)

        for item in rows:
            item.append(compare(indigo, item[1], item[10]))
            newRows.append(item)


        writer.writerows(newRows)
    
