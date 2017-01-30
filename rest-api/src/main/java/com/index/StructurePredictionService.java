package com.index;

import com.index.bayesian.BayesianNetworkData;
import com.index.bayesian.SmilesToProb;
import com.index.bayesian.StructureBayesianNetwork;
import com.index.bayesian.StructurePrediction;
import com.index.entitys.*;
import com.index.repos.EdgeRepo;
import com.index.repos.EdgeMetadataRepo;
import com.index.repos.StructureRepo;
import org.RDKit.*;
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

    public List<StructurePrediction> prediction(String smiles, int userId, int groupId){

        try {
            System.load(System.getProperty("user.dir") + "/libs/rdkit/Code/JavaWrappers/gmwrapper/libGraphMolWrap.so");
        }catch (UnsatisfiedLinkError e){
            throw new UnsatisfiedLinkError("Can't Link RDKIT");
        }
        if (smiles.length() != 0) {
            String mol = generateMolString(RWMol.MolFromSmiles(smiles));
            System.out.println(mol);
        }

        BayesianNetworkData data = new BayesianNetworkData(smiles, edgeMetadataRepo, userId, groupId);
        StructureBayesianNetwork network = new StructureBayesianNetwork(data);
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
        while (true){
            path.add(smilesTo);
            // TODO join on smilesFrom with structures to check end node.
            List<Object[]> options = edgeMetadataRepo.findBySmilesFromAllSmilesToAndTotalTimesPicked(smilesTo);
            if (options.size() == 1) {
                smilesTo = (String) options.get(0)[0];
            }else{
                break;
            }
        }
        return path;
    }

    private String generateMolString(RWMol mol){
        if (mol != null) {
            mol.compute2DCoords();
            String[] splitMol = mol.MolToMolBlock().split("\n");

            StringBuilder builder = new StringBuilder();
            for (int i = 2; i < splitMol.length; i++) {
                builder.append(splitMol[i]);
                builder.append("\n");
            }
            return builder.toString();
        }
        return "";
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
