package com.index;

import com.index.entitys.Structure;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import static org.springframework.web.bind.annotation.RequestMethod.GET;
import static org.springframework.web.bind.annotation.RequestMethod.POST;

@RestController
public class StructurePredictionController
{
    @Autowired
    private StructurePredictionService service;

    @RequestMapping("/")
    public Response respond()
    {
        return service.createResponse();
    }

    @CrossOrigin
    @RequestMapping(method=GET, path="/prediction")
    public Iterable<Structure> predict(@RequestParam String smiles, @RequestHeader int userId, @RequestHeader int groupId) {
        return service.prediction();
    }

    @CrossOrigin
    @RequestMapping(method=POST, path="/add/user/decision")
    public void addEdge(@RequestBody Structure[] path, @RequestHeader int userId, @RequestHeader int groupId){
        service.addEdge(path[0], path[1], userId, groupId);
    }
}
