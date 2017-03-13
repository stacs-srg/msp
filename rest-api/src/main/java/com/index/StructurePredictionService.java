package com.index;

import com.index.Respones.StructuresPredictionTypes;
import com.index.bayesian.BayesianNetworkData;
import com.index.bayesian.SmilesToProb;
import com.index.bayesian.StructureBayesianNetwork;
import com.index.Respones.StructurePrediction;
import com.index.entitys.*;
import com.index.exceptions.NotEnoughDataForStudyException;
import com.index.repos.EdgeRepo;
import com.index.repos.EdgeMetadataRepo;
import com.index.repos.StructureRepo;
import com.index.repos.StudyDataRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.RDKit.*;

@Service
public class StructurePredictionService
{

    @Autowired
    private EdgeMetadataRepo edgeMetadataRepo;

    @Autowired
    private StructureRepo structureRepo;

    @Autowired
    private EdgeRepo edgeRepo;

    @Autowired
    private StudyDataRepo studyRepo;

    public Response createResponse()
    {
        return new Response("Chemical Molecular Structure Prediction Tool");
    }

    public List<StructurePrediction> prediction(String smiles, int userId, int groupId, int predictionsType){

        BayesianNetworkData data = new BayesianNetworkData(smiles, edgeMetadataRepo, userId, groupId);
        StructureBayesianNetwork network = new StructureBayesianNetwork(data, predictionsType);
        List<StructurePrediction> structures = new ArrayList<>();
        for(SmilesToProb smilesTo : network.generateBestChoices()){
            List<String> path = getPath(smilesTo.getSmilesTo());
            Structure endStructure = structureRepo.findOne(path.remove(path.size() - 1));
            double prob = smilesTo.getProbability();
            structures.add(new StructurePrediction(path, endStructure, prob));
        }
        return structures;
    }

    private List<String> getPath(String smilesTo){
        List<String> path = new ArrayList<>();
        Structure structure = structureRepo.findOne(smilesTo);
        boolean loop = true;
        while (loop){
            loop = false;
            path.add(structure.getSmiles());
            // structure not at end.
            if (structure.getEnd() == 0) {
                List<Structure> options = edgeMetadataRepo.findBySmilesFromAllSmilesToStructures(structure.getSmiles());
                // If there is only one option then carry on through.
                if (options.size() == 1) {
                    structure = options.get(0);
                    loop = true;
                }
            }
        }
        return path;
    }

    public Structure addStructure(ArrayList<Structure> path, int userId, int groupId){

        cleanPath(path);
        //Set end of the path to an end structure.
        Structure end = path.get(path.size() - 1);
        end.setEnd(1);

        if(!structureRepo.exists(path.get(0).getSmiles())) {
            structureRepo.save(path.get(0));
        }
        
        for(int i = 1; i < path.size(); i++){
            if(!structureRepo.exists(path.get(i).getSmiles())){
                structureRepo.save(path.get(i));
            }
            addEdge(path.get(i - 1).getSmiles(), path.get(i).getSmiles(), userId, groupId);
        }
        return end;
    }

    public ArrayList<Structure> cleanPath(ArrayList<Structure> path){

        int index = 0;

        while (index < path.size() - 1) {
            // Path has an edge to itself. Should not be allowed.
            if (path.get(index).getSmiles().compareTo(path.get(index + 1).getSmiles()) == 0) {
                path.remove(index + 1);
            } else if (index < path.size() - 2 &&
                    path.get(index).getSmiles().compareTo(path.get(index + 2).getSmiles()) == 0){
                // Undo or redo on the path.
                path.remove(index + 1);
                path.remove(index + 1);
            } else {
                index++;
            }
        }
        return path;
    }

    private void addEdge(String from, String to, int userId, int groupId){
        edgeRepo.save(new Edge(from, to));
        EdgeMetadataKey userKey = new EdgeMetadataKey(userId, groupId, from, to);

        if(edgeMetadataRepo.exists(userKey)){
           edgeMetadataRepo.increment(userKey);
        }else{
            edgeMetadataRepo.save(new EdgeMetadata(userKey));
        }
    }

    public String generateSmiles(String smiles){
        try {
            System.load(System.getProperty("user.dir") + "/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
        }catch (UnsatisfiedLinkError e){
            throw new UnsatisfiedLinkError("Can't Link RDKIT");
        }
        return generateMolString(RWMol.MolFromSmiles(smiles));
    }

    private String generateMolString(RWMol mol){
        if (mol != null) {
            mol.compute2DCoords();
            String[] splitMol = mol.MolToMolBlock(true).split("\n");

            StringBuilder builder = new StringBuilder();
            for (int i = 2; i < splitMol.length; i++) {
                builder.append(splitMol[i]);
                builder.append("\n");
            }
            return builder.toString();
        }
        return "";
    }

    public void addStudyData(Structure endStructure, Date startTime, int userId, int numberOfPredictions,
                             int rubs, int undos, int predictionsType){
        studyRepo.save(new StudyData(startTime, new Date(), userId,
                endStructure.getSmiles(), undos, rubs, numberOfPredictions, predictionsType));
    }

    public StructuresPredictionTypes getStructuresForUserWithTypes(int userId) throws NotEnoughDataForStudyException {
        List<Structure> userStructures = edgeMetadataRepo.findByUserIdAllEndStructuresRandom(userId);
        List<Structure> otherStructures = edgeMetadataRepo.findByNotUserIdAllEndStructuresRandom(userId);
        return new StructuresPredictionTypes(userStructures, otherStructures);
    }
}
