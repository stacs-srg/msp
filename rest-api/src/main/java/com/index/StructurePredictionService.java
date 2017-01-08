package com.index;

import com.index.entitys.*;
import com.index.repos.EdgeRepo;
import com.index.repos.MetadataGroupRepo;
import com.index.repos.MetadataUserRepo;
import com.index.repos.StructureRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class StructurePredictionService
{

    @Autowired
    private MetadataGroupRepo metadataGroupRepo;

    @Autowired
    private MetadataUserRepo metadataUserRepo;

    @Autowired
    private StructureRepo structureRepo;

    @Autowired
    private EdgeRepo edgeRepo;

    public Response createResponse()
    {
        return new Response("Chemical Molecular Structure Prediction tool");
    }

    public Iterable<Structure> prediction(){

        try {
            //System.load(System.getProperty("repo.path") + "structure-predicition-sh/rest-api/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
            System.load("/cs/home/jacr/cs4099/structure-predicition-sh/rest-api/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
        }catch (UnsatisfiedLinkError e){
            System.out.println("Can't Link RDKIT. ");
            return null;
        }

        return structureRepo.findAll();
    }

    public void addEdge(Structure to, Structure from, int userId, int groupId){
        structureRepo.save(to);
        structureRepo.save(from);
        edgeRepo.save(new Edge(to.getSmiles(), from.getSmiles()));

        metadataUserRepo.save(new MetadataUser(userId, to.getSmiles(), from.getSmiles()));
        metadataUserRepo.increment(new MetadataUserKey(userId, to.getSmiles(), from.getSmiles()));

        metadataGroupRepo.save(new MetadataGroup(groupId, to.getSmiles(), from.getSmiles()));
        metadataGroupRepo.increment(new MetadataGroupKey(groupId, to.getSmiles(), from.getSmiles()));
    }
}
