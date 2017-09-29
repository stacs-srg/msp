# MSP

MSP stands for Molecular Structure Predictor and it is a novel approach to predict molecular structures next-step while these are drawn.

## How to Build Rest API

1. get RDKit repo:
    gradle cloneRDKit

2. you are required to generate the RDkit wrappers:
   		buildRDKit.sh
        (you might need some dependices) (takes sometime) 
        
        * alterantive - If you do not require to run the clean up function button (which you will more likely not need to):
			replace file StructurePredictionService.java with StructurePredictionService.java.replace
			files found in folder: /rest-api/src/main/java/com/index

1. Move into the /rest-api from root and run: 
	gradle build


## Run database

### Run it locally

1.You now need to download and run hsqldb. (The database script can be found in /rest-api/database.script)
	download link:
	https://sourceforge.net/projects/hsqldb/files/

2. Take database.script file from /rest-api folder.

3. run with command from hsqldb folder:
	sudo java -cp hsqldb.jar org.hsqldb.Server -database.0 file:database.script -dbname.0 jacr_structure_prediction

4. change file /rest-api/application.properties to the properties with (comment out others):
		spring.datasource.url=jdbc:mysql://jacr.host.cs.st-andrews.ac.uk/spring.datasource.url=jdbc:hsqldb:hsql://localhost:9001/jacr_structure_prediction
	
### Run it in School of Computer Science

1. change file /rest-api/application.properties to the properties with (comment out other): 
	spring.datasource.url=jdbc:mysql://jacr.host.cs.st-andrews.ac.uk/jacr_structure_prediction


### Run Rest API

To run the rest-api from command line run bash file /rest-api/run.sh


### How to run web page 

open file /front-end/structure-preidtion.js
and set the server address at the top of the javascript file to:

    http://localhost:17938/structure-prediction

To open the front end componenet run:
	google-chrome --allow-file-access-from-files

And open struct-predicion.html in that window.


---

## Study

The data of the study is at this link: https://quicksilver.hg.cs.st-andrews.ac.uk/msp_sensitive_data/

Access to the study data is private. Contact Simone or Prof. Dobson for more info.


