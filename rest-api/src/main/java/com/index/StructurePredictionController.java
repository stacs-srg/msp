package com.index;

import com.index.bayesian.StructurePrediction;
import com.index.entitys.Structure;
import com.index.entitys.StudyData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

import static org.springframework.web.bind.annotation.RequestMethod.GET;
import static org.springframework.web.bind.annotation.RequestMethod.POST;

@RestController
@RequestMapping("/structure-prediction")
public class StructurePredictionController
{
    @Autowired
    private StructurePredictionService service;

    @RequestMapping(method=GET, path="/")
    public Response respond()
    {
        return service.createResponse();
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/prediction")
    public List<StructurePrediction> predict(@RequestParam String smiles, @RequestHeader int userId, @RequestHeader int groupId) {
        System.out.println("Prediction called. Smile: " + smiles);
	    return service.prediction(smiles, userId, groupId);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure")
    public void addStrucutre(@RequestBody ArrayList<Structure> path, @RequestHeader int userId, @RequestHeader int groupId){
        service.addStructure(path, userId, groupId);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure/study")
    public void addStrucutre(@RequestBody ArrayList<Structure> path, @RequestHeader @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss:SS") Date startTime,
                             @RequestHeader int userId, @RequestHeader int groupId, @RequestHeader int predictionsUsed){
        Structure endStructure = service.addStructure(path, userId, groupId);
        service.addStudyData(endStructure, startTime, userId, predictionsUsed);
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/get/structures/userid")
    public Iterable<Structure> getStructuresForUser(@RequestHeader int userId){
        return service.getStructuresForUser(userId);
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/generate/molfile")
    public String cleanStrucutre(@RequestParam String smiles){
        return service.generateSmiles(smiles);
    }
}
