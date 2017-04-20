 mysql -u jacr -h jacr.host.cs.st-andrews.ac.uk -pqU2ZcSJh8b!e1W jacr_structure_prediction -e "select *, TIMEDIFF(end_time, start_time) as time_taken from study_data order by user_id, smiles;" -B > study_data_table.tsv

