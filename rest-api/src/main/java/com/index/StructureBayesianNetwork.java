package com.index;

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
    //required as node names cannot be have special characters in node names.
    private Map<String, String> structNodeNameToSmiles;

    private Network network;

    private int userId;
    //TODO repeat userIds but change to be groupIds
    private int groupId;

    public StructureBayesianNetwork(String smilesFrom, int userId, int groupId, EdgeMetadataRepo repo){

        this.userId = userId;
        this.groupId = groupId;
        this.structNodeNameToSmiles = new HashMap<>();

        List<Object[]> userIds = repo.findBySmilesFromAllUsersAndTotalChoicesMade(smilesFrom);
        // No choices to make currently.
        if (userIds.size() == 0){
            return;
        }
        List<Object[]> smilesTos = repo.findBySmilesFromAllSmilesToAndTotalTimesPicked(smilesFrom);
        // Only one choice can be made that is the answer.
        if (smilesTos.size() == 1){
            structNodeNameToSmiles.put(structureNodeStart + 0, (String) smilesTos.get(0)[0]);
            return;
        }
        long totalDecisions = repo.findBySmilesFromTotalRows(smilesFrom);

        this.network = new Network();
        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);

        Map<String, Long> userIdTotalDecisions = new LinkedHashMap<>();
        Map<String, Long> smilesToTotalPicks = new LinkedHashMap<>();
        addOutcomesToNetworkAndSetupMaps(userIdTotalDecisions, smilesToTotalPicks, userIds, smilesTos);

        if(userIds.size() == 1 || userIdTotalDecisions.get(userNodeStart + userId) == null){
            // No need for user node as no choice to be made!
            network.deleteNode("user");
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(userNodeName, 0);
            network.deleteOutcome(userNodeName, 0);
            setUserNodeDef(userIdTotalDecisions, totalDecisions);
            network.addArc(userNodeName, structureNodeName);
        }
        // remove the default structures.
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        setStructureChoiceDef(smilesToTotalPicks, userIdTotalDecisions, repo.findBySmilesFrom(smilesFrom), totalDecisions);
        // print network for testing purposes.
        network.writeFile("test_network.xdsl");
    }

    private void addOutcomesToNetworkAndSetupMaps(Map<String, Long> userIdTotalDecisions,
                                                  Map<String, Long> smilesToTotalPicks, List<Object[]> userIds, List<Object[]> smilesTos){
        int smileIndex = 0;
        for(int i = 0; i < userIds.size() || i < smilesTos.size(); i++){
            if (i < userIds.size()) {
                userIdTotalDecisions.put(userNodeStart + userIds.get(i)[0], (Long) userIds.get(i)[1]);
                network.addOutcome(userNodeName, userNodeStart + userIds.get(i)[0]);
            }
            // Add a node for each smile
            if (i < smilesTos.size()) {
                network.addOutcome(structureNodeName, structureNodeStart + smileIndex);
                structNodeNameToSmiles.put(structureNodeStart + smileIndex, (String) smilesTos.get(i)[0]);
                smilesToTotalPicks.put(structureNodeStart + smileIndex, (Long) smilesTos.get(i)[1]);
                smileIndex++;
            }
        }
    }

    private void setUserNodeDef(Map<String, Long> userIdTotalDecisions, long totalDecisions){
        double[] userDefinition = new double[userIdTotalDecisions.size()];
        int i = 0;
        for(Map.Entry<String, Long> userEntry : userIdTotalDecisions.entrySet()){
            // The number of times a user has made a choice / total times a choice has been made.
            userDefinition[i++] = (double) userEntry.getValue() / (double) totalDecisions;
        }
        network.setNodeDefinition(userNodeName, userDefinition);
    }

    private void setStructureChoiceDef(Map<String, Long> smilesToToTotalTimesPicked, Map<String, Long> userIdTotalDecisions, List<EdgeMetadata> edges, long totalDecisions){

        double[] structureDefinition = new double[userIdTotalDecisions.size() * smilesToToTotalTimesPicked.size()];
        int defIndex = 0;
        int edgesIndex = 0;
        System.out.println("userSize: " + userIdTotalDecisions.size());
        System.out.println("SmilesSize: " + smilesToToTotalTimesPicked.size());
        for (Map.Entry<String, Long> userEntry : userIdTotalDecisions.entrySet()) {
            for (Map.Entry<String, Long> SmileEntry : smilesToToTotalTimesPicked.entrySet()) {
                // Check you have not run out of edges to look at.
                if (edgesIndex < edges.size()) {
                    EdgeMetadata currentEdge = edges.get(edgesIndex);
                    int currentEdgeUser = currentEdge.getEdgeMetadataKey().getUserId();
                    // current Edge being looked at is the current user being iterated in loop.
                    if (userEntry.getKey().compareTo(userNodeStart + currentEdgeUser) == 0){
                        // P(A | B) = ( P(B | A) * P(A) ) / P(B)
                        double probOfThisUserGivenThisSmileTo = (double) currentEdge.getTimes() / SmileEntry.getValue();
                        double probOfThisSmileTo = (double) SmileEntry.getValue() / (double) totalDecisions;
                        double probOfThisUser = (double) userEntry.getValue() / (double) totalDecisions;
                        System.out.println("probOfThisUserGivenThisSmileTo: " + probOfThisUserGivenThisSmileTo);
                        System.out.println("probOfThisSmileTo: " + probOfThisSmileTo);
                        System.out.println("probOfThisUser: " + probOfThisUser);
                        if (probOfThisUser != 1) {
                            structureDefinition[defIndex] = (probOfThisUserGivenThisSmileTo * probOfThisSmileTo) / probOfThisUser;
                        }else{
                            structureDefinition[defIndex] = probOfThisSmileTo;
                        }
                        edgesIndex++;
                    }
                }
                defIndex++;
            }
        }
        network.setNodeDefinition(structureNodeName, structureDefinition);
    }

    public List<SmilesToProb> generateBestChoices(){

        List<SmilesToProb> result = new ArrayList<>();
        double[] probs;
        // No next choice found, one result found or if user choice to make.
        if (structNodeNameToSmiles.size() == 0){
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
