package com.index;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    @RequestMapping(method=GET, path="/prediction")
    public Iterable<Structure> predict(@RequestParam String smile) {
        return service.prediction();
    }

    @RequestMapping(method=POST, path="/add/edge")
    public void addEdge(@RequestParam Structure to, @RequestParam Structure from){
        service.addEdge(to, from);
    }
}
