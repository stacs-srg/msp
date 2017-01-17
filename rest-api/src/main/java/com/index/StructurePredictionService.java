package com.index;

import com.index.entitys.*;
import com.index.repos.EdgeRepo;
import com.index.repos.EdgeMetadataRepo;
import com.index.repos.SmilesToProb;
import com.index.repos.StructureRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


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
        return new Response("Chemical Molecular Structure Prediction Tool");
    }

    public Iterable<Structure> prediction(String smiles, int userId, int groupId){

        try {
            // TODO remove mols in database and replace with use RDKIT to generate.
            //System.load(System.getenv("HOME") + "/cs4099/structure-predicition-sh/rest-api/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
        }catch (UnsatisfiedLinkError e){
            throw new UnsatisfiedLinkError("Can't Link RDKIT");
        }

        StructureBayesianNetwork network = new StructureBayesianNetwork(smiles, userId, groupId, edgeMetadataRepo);
        List<Structure> structures = new ArrayList<>();
        for(SmilesToProb smilesTo : network.generateBestChoices()){
            structures.add(structureRepo.findOne(smilesTo.getSmilesTo()));
        }
        return structures;
    }

    public void addStructure(Structure[] path, int userId, int groupId){
        path[path.length - 1].setEnd(1);
        structureRepo.save(path[0]);
        for(int i = 1; i < path.length; i++){
            structureRepo.save(path[i]);
            addEdge(path[i - 1].getSmiles(), path[i].getSmiles(), userId, groupId);
        }
    }

    private void addEdge(String from, String to, int userId, int groupId){
        edgeRepo.save(new Edge(from, to));
        EdgeMetadataKey userKey = new EdgeMetadataKey(userId, from, to);

        if(edgeMetadataRepo.exists(userKey)){
           edgeMetadataRepo.increment(userKey);
        }else{
            edgeMetadataRepo.save(new EdgeMetadata(userKey, groupId));
        }
    }
}
