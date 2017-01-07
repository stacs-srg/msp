package com.index;

import org.RDKit.RWMol;

import com.index.entitys.Edge;
import com.index.entitys.Structure;
import com.index.repos.EdgeRepo;
import com.index.repos.StructureRepo;
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

        Edge edge = new Edge(to.getSmile(), from.getSmile());
        edgeRepo.save(edge);
    }
}
