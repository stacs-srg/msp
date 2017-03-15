package com.index;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.index.Respones.StructurePrediction;
import com.index.Respones.StructuresPredictionTypes;
import com.index.RestParamaters.StudyStructuresDescription;
import com.index.entitys.Structure;
import com.index.entitys.StudyData;
import com.index.exceptions.NotEnoughDataForStudyException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.web.bind.annotation.RequestMethod.GET;
import static org.springframework.web.bind.annotation.RequestMethod.POST;

@RestController
@RequestMapping("/structure-prediction")
public class StructurePredictionController
{
    @Autowired
    private StructurePredictionService service;

    private static final String dateFormat = "yyyy-MM-dd HH:mm:ss:SS";

    @RequestMapping(method=GET, path="/")
    public Response respond()
    {
        return service.createResponse();
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/prediction")
    public List<StructurePrediction> predict(@RequestParam String smiles, @RequestHeader int predictionType, @RequestHeader int userId, @RequestHeader int groupId) {
        System.out.println("Prediction called. Smile: " + smiles);
	    return service.prediction(smiles, userId, groupId, predictionType);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure")
    public void addStrucutre(@RequestBody ArrayList<Structure> path, @RequestHeader int userId, @RequestHeader int groupId){
        service.addStructure(path, userId, groupId);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure/study")
    public void addStrucutreStudy(@RequestBody ArrayList<Structure> path, @RequestHeader String studyDataJson) throws IOException {
        StudyData studyData = CreateStudyData(studyDataJson);
        Structure endStructure = service.addStructure(path, studyData.getUserId(), studyData.getGroupId());
        studyData.setSmilesDrawn(endStructure.getSmiles());
        service.addStudyData(studyData);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/study")
    public void addStudy(@RequestBody ArrayList<Structure> path, @RequestHeader String studyDataJson) throws IOException {
        if (path.size() > 0) {
            StudyData studyData = CreateStudyData(studyDataJson);
            Structure endStructure = service.getEndStructure(path);
            studyData.setSmilesDrawn(endStructure.getSmiles());
            service.addStudyData(studyData);
        }
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/get/structures/userid")
    public StructuresPredictionTypes getStructuresForUser(@RequestHeader String description, @RequestHeader int userId) throws NotEnoughDataForStudyException, IOException {
        ObjectMapper mapper = new ObjectMapper();
        return service.getStructuresForUserWithTypes(userId, mapper.readValue(description, StudyStructuresDescription.class));
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/generate/molfile")
    public String cleanStrucutre(@RequestParam String smiles){
        return service.generateSmiles(smiles);
    }

    private StudyData CreateStudyData(String studyDataJson) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.setDateFormat(new SimpleDateFormat(dateFormat));
        return mapper.readValue(studyDataJson, StudyData.class);
    }
}
