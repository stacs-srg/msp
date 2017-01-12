package com.index;

import com.index.entitys.Edge;
import com.index.entitys.EdgeMetadata;
import com.index.repos.EdgeMetadataRepo;
import com.index.repos.SmilesToProb;
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

    //required as node names cannot be have special characters.
    private Map<String, String> structNodeNameToSmiles;

    private Network network;


    public StructureBayesianNetwork(String smilesFrom, EdgeMetadataRepo repo){

        List<Object[]> userIds = repo.findBySmilesFromAllUsersPlusTotalChoicesMade(smilesFrom);
        // No choices to make currently.
        if (userIds.size() == 0){
            return;
        }
        List<String> smilesTos = repo.findBySmilesFromAllSmilesTo(smilesFrom);
        // create network.
        this.network = new Network();
        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);

        structNodeNameToSmiles = new HashMap<>();
        HashMap<Integer, Long> userIdToTotalChoicesMade = new HashMap<>();
        int smileIndex = 0;
        for(int i = 0; i < userIds.size() || i < smilesTos.size(); i++){
            if (i < userIds.size()) {
                userIdToTotalChoicesMade.put((Integer) userIds.get(i)[0], (Long) userIds.get(i)[1]);
                network.addOutcome(userNodeName, userNodeStart + userIds.get(i)[0]);
            }
            // add a node for each smile
            if (i < smilesTos.size()) {
                network.addOutcome(structureNodeName, structureNodeStart + smileIndex);
                structNodeNameToSmiles.put(structureNodeStart + smileIndex, smilesTos.get(i));
                smileIndex++;
            }
        }

        if(userIds.size() == 1){
            // No need for user node as no choice to be made!
            network.deleteNode("user");
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(userNodeName, 0);
            network.deleteOutcome(userNodeName, 0);
            setUserNodeDef(userIds.size());
            network.addArc(userNodeName, structureNodeName);
        }
        // Must have two nodes, so decision has a null decision.
        if (smilesTos.size() == 1){
            network.addOutcome(structureNodeName, structureNodeStart + "null");
        }
        // remove the default structures.
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        // set probs given the users.
        setStructureChoiceDef(userIdToTotalChoicesMade, repo.findBySmilesFrom(smilesFrom));
        // print network for testing purposes.
        network.writeFile("test_network.xdsl");
    }

    private void setStructureChoiceDef(Map<Integer, Long> userIdToTotalChoicesMade, List<EdgeMetadata> edges){
        int userIdsSize = userIdToTotalChoicesMade.size();
        double[] structureDefinition;

        if (structNodeNameToSmiles.size() == 1){
            // For each user, just force the choice to be only one it can be.
            structureDefinition = new double[2 * userIdsSize];
            for(int i = 0, j = 0; i < userIdsSize; i++){
                structureDefinition[j++] = 0;
                structureDefinition[j++] = 1;
            }
        }else {
            structureDefinition = new double[userIdsSize * structNodeNameToSmiles.size()];
            int defIndex = 0;
            int edgesIndex = 0;
            for (Integer currentUserId : userIdToTotalChoicesMade.keySet()) {
                for (int i = 0; i < structNodeNameToSmiles.size(); i++) {
                    // loop around users and for each edge add a probs.
                    EdgeMetadata current = null;

                    if (edgesIndex < edges.size()) {
                        current = edges.get(edgesIndex);
                    }

                    if (current != null && currentUserId != null && current.getEdgeMetadataKey().getUserId() == currentUserId) {
                        double times = current.getTimes();
                        double totalChoicesMade = userIdToTotalChoicesMade.get(currentUserId);
                        structureDefinition[defIndex++] = times / totalChoicesMade;
                        edgesIndex++;
                    }else{
                        structureDefinition[defIndex++] = 0;
                    }
                }
            }
        }
        network.setNodeDefinition(structureNodeName, structureDefinition);
    }

    private void setUserNodeDef(int size){
        // All users are equally likely.
        double[] userDefinition;
        if (size == 1){
            userDefinition = new double[2];
            userDefinition[0] = 0;
            userDefinition[1] = 1;
        }else{
            // always an equal chance.
            double userProb = 1 / (double) size;
            userDefinition = new double[size];
            for (int i = 0; i < size; i++){
                userDefinition[i] = userProb;
            }
        }
        network.setNodeDefinition(userNodeName, userDefinition);
    }

    public List<SmilesToProb> generateBestChoices(int userId, int groupId){

        List<SmilesToProb> result = new ArrayList<>();
        double[] probs;
        // No next choice found, one result found or if user choice to make.
        if (structNodeNameToSmiles == null){
            return result;
        }else if(structNodeNameToSmiles.size() == 1){
            List<String> list = new ArrayList<>(structNodeNameToSmiles.values());
            result.add(new SmilesToProb(list.get(0), 0));
            return result;
        } else if (network.getNodeCount() > 1) {
            network.setEvidence(userNodeName, userNodeStart + userId);
            network.updateBeliefs();
            probs = network.getNodeValue(structureNodeName);
        }else{
            probs = network.getNodeDefinition(structureNodeName);
        }

        String[] aSuccessOutcomeIds = network.getOutcomeIds(structureNodeName);
        for (int i = 0; i < aSuccessOutcomeIds.length; i++) {
            // Getting the probability for node:
            double prob = probs[i];
            String smilesTo = structNodeNameToSmiles.get(structureNodeStart + i);
            result.add(new SmilesToProb(smilesTo, prob));
        }
        // Sort it in order of probabilities.
        Collections.sort(result);
        return result;
    }
}
