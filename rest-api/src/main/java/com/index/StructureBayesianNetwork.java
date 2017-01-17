package com.index;

import com.index.repos.EdgeMetadataRepo;
import com.index.repos.SmilesToProb;
import smile.Network;
import smile.SMILEException;

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

        createNetwork();

        HashMap<String, Long> userIdToTotalChoicesMade = new HashMap<>();
        HashMap<String, Long> smilesToToTotalTimesPicked = new HashMap<>();
        addOutcomesToNetworkAndSetupMaps(userIdToTotalChoicesMade, smilesToToTotalTimesPicked, userIds, smilesTos);

        if(userIds.size() == 1 || userIdToTotalChoicesMade.get(userNodeStart + userId) == null){
            // No need for user node as no choice to be made!
            network.deleteNode("user");
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(userNodeName, 0);
            network.deleteOutcome(userNodeName, 0);
            setUserNodeDef(userIdToTotalChoicesMade, totalDecisions);
            network.addArc(userNodeName, structureNodeName);
        }
        // remove the default structures.
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        setStructureChoiceDef(smilesToToTotalTimesPicked, totalDecisions);
        // print network for testing purposes.
        network.writeFile("test_network.xdsl");
    }

    private void addOutcomesToNetworkAndSetupMaps(HashMap<String, Long> userIdToTotalChoicesMade,
                                                  HashMap<String, Long> smilesToToTotalTimesPicked, List<Object[]> userIds, List<Object[]> smilesTos){
        int smileIndex = 0;
        for(int i = 0; i < userIds.size() || i < smilesTos.size(); i++){
            if (i < userIds.size()) {
                userIdToTotalChoicesMade.put(userNodeStart + userIds.get(i)[0], (Long) userIds.get(i)[1]);
                network.addOutcome(userNodeName, userNodeStart + userIds.get(i)[0]);
            }
            // Add a node for each smile
            if (i < smilesTos.size()) {
                network.addOutcome(structureNodeName, structureNodeStart + smileIndex);
                structNodeNameToSmiles.put(structureNodeStart + smileIndex, (String) smilesTos.get(i)[0]);
                smilesToToTotalTimesPicked.put(structureNodeStart + smileIndex, (Long) smilesTos.get(i)[1]);
                smileIndex++;
            }
        }
    }

    private void createNetwork(){
        this.network = new Network();
        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);
    }

    private void setStructureChoiceDef(Map<String, Long> smilesToToTotalTimesPicked, long totalDecisions){
        int userDefSize;
        double[] userDefinition = null;
        try {
            userDefinition = network.getNodeDefinition(userNodeName);
            userDefSize = userDefinition.length;
        }catch (SMILEException e){
             userDefSize = 1;
        }
        String[] structureOutcomes = network.getOutcomeIds(structureNodeName);
        double[] structureDefinition = new double[userDefSize * smilesToToTotalTimesPicked.size()];
        int defIndex = 0;
        for (int j = 0; j < userDefSize; j++) {
            for (String structure : structureOutcomes) {
                // P(A) = P(A U B) * P(B) / P(B)
                double structDef = smilesToToTotalTimesPicked.get(structure) / (double) totalDecisions;
                double userDef = (userDefinition != null)  ? userDefinition[j] : 1;
                structureDefinition[defIndex++] = (structDef * userDef ) / userDef;
            }
        }
        network.setNodeDefinition(structureNodeName, structureDefinition);
    }

    private void setUserNodeDef(Map<String, Long> userIdToTotalChoicesMade, long totalDecisions){
        String[] userOutcomes = network.getOutcomeIds(userNodeName);
        double[] userDefinition = new double[userOutcomes.length];
        int i = 0;
        for(String user: userOutcomes){
            // The number of times a user has made a choice / total times a choice has been made.
            userDefinition[i++] = (double) userIdToTotalChoicesMade.get(user) / (double) totalDecisions;
        }
        network.setNodeDefinition(userNodeName, userDefinition);
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
