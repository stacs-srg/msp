package com.index;

import com.index.entitys.*;
import com.index.repos.EdgeRepo;
import com.index.repos.EdgeMetadataRepo;
import com.index.repos.StructureRepo;
import org.RDKit.RWMol;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;


@Service
public class StructurePredictionService
{

    @Autowired
    private EdgeMetadataRepo edgeMetadataRepo;

    @Autowired
    private StructureRepo structureRepo;

    @Autowired
    private EdgeRepo edgeRepo;

    public Response createResponse()
    {
        return new Response("Chemical Molecular Structure Prediction tool");
    }

    public Iterable<Structure> prediction(String smile, int userId, int groupId){

        try {
            System.load(System.getenv("HOME") + "/cs4099/structure-predicition-sh/rest-api/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
        }catch (UnsatisfiedLinkError e){
            throw new UnsatisfiedLinkError("Can't Link RDKIT");
        }

        StructureBayesianNetwork network = new StructureBayesianNetwork(edgeMetadataRepo.findAll());

        List<Structure> structures = new ArrayList<>();

        for(Edge edge : network.generateBestChoices()){
            structures.add(structureRepo.findOne(edge.getEdgeKey().getSmilesTo()));
        }

        return structures;
    }

    public void addEdge(Structure to, Structure from, int userId, int groupId){
        structureRepo.save(to);
        structureRepo.save(from);
        edgeRepo.save(new Edge(to.getSmiles(), from.getSmiles()));

        EdgeMetadataKey userKey = new EdgeMetadataKey(userId, to.getSmiles(), from.getSmiles());

        if(edgeMetadataRepo.exists(userKey)){
           edgeMetadataRepo.increment(userKey);
        }else{
            edgeMetadataRepo.save(new EdgeMetadata(userKey, groupId));
        }
    }
}
