package com.index;

import com.index.entitys.Edge;
import com.index.entitys.EdgeMetadata;
import smile.Network;

import java.util.*;

/**
 * Created by jacr on 08/01/17.
 */
public class StructureBayesianNetwork {

    private static final String userNodeName = "user";

    private static final String structureNodeName = "structureChoice";

    private static final String userNodeStart = "user_";

    private static final String structureNodeStart = "struct_";

    private Map<String, String> structNodeNameToSmiles;

    private Network network;

    private List<EdgeMetadata> edgeMetadata;


    public StructureBayesianNetwork(List<EdgeMetadata> edges){
        this.network = new Network();
        this.edgeMetadata = edges;

        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);

        Set<Integer> userIds = new HashSet<>();
        Map<String, Integer> smilesToMappedTotalTimes = new HashMap<>();

        structNodeNameToSmiles = new HashMap<>();
        int smileIndex = 0;

        // Could be replaced by quires:
        for (EdgeMetadata edge : edges){
            int userId = edge.getEdgeMetadataKey().getUserId();
            if (!userIds.contains(userId)){
                userIds.add(userId);
                network.addOutcome(userNodeName, userNodeStart + userId);
            }

            String smilesTo = edge.getEdgeMetadataKey().getSmilesTo();
            if(!smilesToMappedTotalTimes.containsKey(smilesTo)){
                smilesToMappedTotalTimes.put(smilesTo, edge.getTimes());
                network.addOutcome(structureNodeName, structureNodeStart + smileIndex);
                structNodeNameToSmiles.put(structureNodeStart + smileIndex, smilesTo);
                smileIndex++;
            }else{
                int newTotal = smilesToMappedTotalTimes.get(smilesTo) + edge.getTimes();
                smilesToMappedTotalTimes.put(smilesTo, newTotal);
            }
        }
        // By default the node must have two outcomes. Remove the default outcomes.
        network.deleteOutcome(userNodeName, 0);
        network.deleteOutcome(userNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);

        int numberOfUsers = userIds.size();

        setUserNodeDef(numberOfUsers);

        network.addArc(userNodeName, structureNodeName);
        setStructureChoiceDef(numberOfUsers, edges, smilesToMappedTotalTimes);

    }

    private void setStructureChoiceDef(int numberOfUsers, List<EdgeMetadata> edges,  Map<String, Integer> smilesToMappedTotalTimes){
        double[] structureDefinition = new double[numberOfUsers * smilesToMappedTotalTimes.size()];

        for(int i = 0; i < structureDefinition.length; i++){

        }

        network.setNodeDefinition(structureNodeName, structureDefinition);
    }

    private void setUserNodeDef(int size){
        double userProb = 1 / size;
        double[] userDefinition = new double[size];
        for (int i = 0; i < size; i++){
            userDefinition[i] = userProb;
        }
        network.setNodeDefinition(userNodeName, userDefinition);
    }

    private int searchNodeForIndexValue(String nodeId, String value){
        String[] aSuccessOutcomeIds = network.getOutcomeIds(nodeId);
        for (int i = 0; i < aSuccessOutcomeIds.length; i++) {
            if (value.compareTo(aSuccessOutcomeIds[i]) == 0) {
                return i;
            }
        }
        return -1;
    }

    public List<Edge> generateBestChoices(int userId, int groupId){

        //int userIdIndex = searchNodeForIndexValue(userNodeName, userId + "");

//        double[] nodeValues = network.getNodeValue(structureNodeName);
//        System.out.println("Size: " + nodeValues.length);
//        for(int i = 0; i < nodeValues.length; i++){
//            System.out.println("i: " + nodeValues[i]);
//        }
//
//        network.setEvidence(userNodeName, userNodeStart + userId);
//        network.updateBeliefs();
//
//        nodeValues = network.getNodeValue(structureNodeName);
//        System.out.println("Size: " + nodeValues.length);
//
//        for(int i = 0; i < nodeValues.length; i++){
//            System.out.println("i: " + nodeValues[i]);
//        }

        List<Edge> result = new ArrayList<>();
        for (EdgeMetadata meta : edgeMetadata){
            result.add(meta.getEdge());
        }
        return result;
    }
}
