package com.index;

import com.index.Respones.StructurePrediction;
import com.index.Respones.StructuresPredictionTypes;
import com.index.entitys.Structure;
import com.index.exceptions.NotEnoughDataForStudyException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Date;
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
    public List<StructurePrediction> predict(@RequestParam String smiles, @RequestHeader int predictionsType, @RequestHeader int userId, @RequestHeader int groupId) {
        System.out.println("Prediction called. Smile: " + smiles);
	    return service.prediction(smiles, userId, groupId, predictionsType);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure")
    public void addStrucutre(@RequestBody ArrayList<Structure> path, @RequestHeader int userId, @RequestHeader int groupId){
        service.addStructure(path, userId, groupId);
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/structure/study")
    public void addStrucutre(@RequestBody ArrayList<Structure> path, @RequestHeader @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss:SS") Date startTime,
                             @RequestHeader int userId, @RequestHeader int groupId, @RequestHeader int predictionsUsed, @RequestHeader int predictionsType){
        Structure endStructure = service.addStructure(path, userId, groupId);
        service.addStudyData(endStructure, startTime, userId, predictionsUsed, 0, 0, predictionsType);
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/get/structures/userid")
    public StructuresPredictionTypes getStructuresForUser(@RequestHeader int userId) throws NotEnoughDataForStudyException {
        return service.getStructuresForUserWithTypes(userId);
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/generate/molfile")
    public String cleanStrucutre(@RequestParam String smiles){
        return service.generateSmiles(smiles);
    }
}
