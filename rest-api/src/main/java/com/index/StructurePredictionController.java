package com.index;

import com.index.bayesian.StructurePrediction;
import com.index.entitys.Structure;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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
    @RequestMapping(method=GET, path="/generate/molfile")
    public String cleanStrucutre(@RequestParam String smiles){
        return service.generateSmiles(smiles);
    }
}
