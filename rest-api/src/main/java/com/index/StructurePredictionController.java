package com.index;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.index.Respones.StructurePrediction;
import com.index.Respones.StructuresPredictionTypes;
import com.index.RestParamaters.StudyStructuresDescription;
import com.index.entitys.Structure;
import com.index.entitys.StudyData;
import com.index.exceptions.NotEnoughDataForStudyException;
import org.jsondoc.core.annotation.ApiMethod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;

import org.jsondoc.core.annotation.Api;
import org.jsondoc.core.annotation.ApiMethod;
import org.jsondoc.core.annotation.ApiResponseObject;
import org.jsondoc.core.annotation.ApiBodyObject;
import org.jsondoc.core.annotation.ApiPathParam;
import org.jsondoc.core.annotation.ApiHeader; 


import static org.springframework.web.bind.annotation.RequestMethod.GET;
import static org.springframework.web.bind.annotation.RequestMethod.POST;

@Api(name = "Structure Prediction", description = "Methods for generating prediction and saving structures.")
@RestController
@RequestMapping(value = "/structure-prediction", produces = MediaType.APPLICATION_JSON_VALUE)
public class StructurePredictionController
{
    @Autowired
    private StructurePredictionService service;

    private static final String dateFormat = "yyyy-MM-dd HH:mm:ss:SS";

    @RequestMapping(value ="/", method=GET, path="/")
    public Response respond()
    {
        return service.createResponse();
    }

    @ApiMethod(description = "Makes prediction based on SMILES string, user ID and group ID.")
    @CrossOrigin
    @RequestMapping(method=GET, path="/prediction", value="/prediction")
    public @ApiResponseObject List<StructurePrediction> predict(
        @ApiPathParam(name="SMILES") @RequestParam String smiles, @RequestHeader int predictionType,  @RequestHeader int userId, @RequestHeader int groupId) {

        System.out.println("Prediction called. Smile: " + smiles);
	    return service.prediction(smiles, userId, groupId, predictionType);
    }

    @ApiMethod(description = "Add structure to the database.")
    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure", value="/add/structure")
    public void addStrucutre(@ApiBodyObject @RequestBody ArrayList<Structure> path, @RequestHeader int userId, @RequestHeader int groupId){
        service.addStructure(path, userId, groupId);
    }

    @ApiMethod(description = "Add structure to the database and data into the study table based on strucutre drawn.")
    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure/study", value="/add/structure/study")
    public void addStrucutreStudy(@ApiBodyObject @RequestBody ArrayList<Structure> path, @RequestHeader String studyDataJson) throws IOException {
        StudyData studyData = CreateStudyData(studyDataJson);
        Structure endStructure = service.addStructure(path, studyData.getUserId(), studyData.getGroupId());
        studyData.setSmilesDrawn(endStructure.getSmiles());
        service.addStudyData(studyData);
    }

    @ApiMethod(description = "Add data into the study table based on structure drawn.")
    @CrossOrigin
    @RequestMapping(method=POST, path="/add/study", value="/add/study")
    public void addStudy(@ApiBodyObject @RequestBody ArrayList<Structure> path, @RequestHeader String studyDataJson) throws IOException {
        if (path.size() > 0) {
            StudyData studyData = CreateStudyData(studyDataJson);
            Structure endStructure = service.getEndStructure(path);
            studyData.setSmilesDrawn(endStructure.getSmiles());
            service.addStudyData(studyData);
        }
    }

    @ApiMethod(description = "Returns a list of structures. Four structures the users has drawn and three someone else has. Each repeated 4 times in a random order.")
    @CrossOrigin
    @RequestMapping(method=GET, path="/get/structures/userid", value = "/get/structures/userid")
    public @ApiResponseObject StructuresPredictionTypes getStructuresForUser(@RequestHeader String description, @RequestHeader int userId) throws NotEnoughDataForStudyException, IOException {
        ObjectMapper mapper = new ObjectMapper();
        return service.getStructuresForUserWithTypes(userId, mapper.readValue(description, StudyStructuresDescription.class));
    }

    @ApiMethod(description = "Generates molfile for SMILES string")
    @CrossOrigin
    @RequestMapping(method=GET, path="/generate/molfile", value = "/generate/molfile")
    public @ApiResponseObject String cleanStrucutre(@ApiPathParam(name="SMILES") @RequestParam String smiles){
        return service.generateSmiles(smiles);
    }

    private StudyData CreateStudyData(String studyDataJson) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.setDateFormat(new SimpleDateFormat(dateFormat));
        return mapper.readValue(studyDataJson, StudyData.class);
    }
}
