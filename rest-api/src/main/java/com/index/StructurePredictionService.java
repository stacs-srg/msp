package com.index;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StructurePredictionService
{

    @Autowired
    private StructureRepo structureRepo;

    @Autowired
    private EdgeRepo edgeRepo;

    public Response createResponse()
    {
        String test = "Hello World";
        return new Response(test);
    }

    public Iterable<Structure> prediction(){
        return structureRepo.findAll();
    }

    public void addEdge(Structure to, Structure from){
        if (structureRepo.findOne(to.getSmile()) == null){
            structureRepo.save(to);
        }
        if (structureRepo.findOne(from.getSmile()) == null){
            structureRepo.save(from);
        }

        Edge edge = new Edge(new EdgeKey(to.getSmile(), from.getSmile()));
        edgeRepo.save(edge);
    }
}
