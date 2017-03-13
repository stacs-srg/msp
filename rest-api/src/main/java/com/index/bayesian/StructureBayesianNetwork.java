package com.index.bayesian;

import smile.Network;

import java.util.*;

/**
 * Created by jacr on 08/01/17.
 */
public class StructureBayesianNetwork {

    private static final String userNodeName = "user";

    private static final String groupNodeName = "group";

    private static final String structureNodeName = "structureChoice";

    private static final String userNodeStart = "user_";

    private static final String groupNodeStart = "group_";

    static final String structureNodeStart = "struct_";

    private BayesianNetworkData data;

    private Network network;


    public StructureBayesianNetwork(BayesianNetworkData data, int predictionsType){

        this.data = data;

        // No choices to make currently OR
        // only one choice can be made that is the answer.
        if (data.getTotalDecisions() == null
                || data.getTotalDecisions() == 0
                || data.getSmilesToTotalPicks().size() == 1){
            return;
        }

        this.network = new Network();
        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);
        network.addNode(Network.NodeType.Cpt, groupNodeName);
        addOutcomesToNetwork();

        // || data.getUserIdTotalDecisions().get(data.getUserId()) == null
        if(data.getUserIdTotalDecisions().size() == 1){
            // No need for user node as no choice to be made!
            network.deleteNode(userNodeName);
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(userNodeName, 0);
            network.deleteOutcome(userNodeName, 0);
            simpleSetNodeDef(data.getUserIdTotalDecisions(), userNodeName);
            network.addArc(userNodeName, structureNodeName);
        }

        if(data.getGroupIdTotalDecisions().size() == 1){
            // No need for user node as no choice to be made!
            network.deleteNode(groupNodeName);
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(groupNodeName, 0);
            network.deleteOutcome(groupNodeName, 0);
            simpleSetNodeDef(data.getGroupIdTotalDecisions(), groupNodeName);
            network.addArc(groupNodeName, structureNodeName);
        }

        // remove the default structures.
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        setStructureChoiceDef(predictionsType);
        // print network for testing purposes.
        network.writeFile("test_network.xdsl");
    }

    private void addOutcomesToNetwork(){
        for ( String key : data.getStructNodeNameToSmiles().keySet()) {
            network.addOutcome(structureNodeName, key);
        }
        for ( Integer key : data.getUserIdTotalDecisions().keySet()) {
            network.addOutcome(userNodeName, userNodeStart + key);
        }
        for ( Integer key : data.getGroupIdTotalDecisions().keySet()) {
            network.addOutcome(groupNodeName, groupNodeStart + key);
        }
    }

    private void simpleSetNodeDef(Map<Integer, Long> map, String nodeName){
        double[] definitions = new double[map.size()];
        int i = 0;
        for(Map.Entry<Integer, Long> entry : map.entrySet()){
            // The number of times a user has made a choice / total times a choice has been made.
            definitions[i++] = (double) entry.getValue() / (double) data.getTotalDecisions();
        }
        network.setNodeDefinition(nodeName, definitions);
    }

    private void setStructureChoiceDef(int predictionsType){

        Map<String, Long> smilesTos = data.getSmilesToTotalPicks();
        Map<Integer, Long> userIds = data.getUserIdTotalDecisions();
        Map<Integer, Long> groupIds = data.getGroupIdTotalDecisions();
        double totalDecisions = data.getTotalDecisions();

        double[] structureDefinition = new double[smilesTos.size() * userIds.size() * groupIds.size()];
        int defIndex = 0;
        for (Map.Entry<Integer, Long> userId : userIds.entrySet()) {
            for (Map.Entry<Integer, Long> groupId : groupIds.entrySet()) {
                for (Map.Entry<String, Long> smilesTo : smilesTos.entrySet()) {

                    // default = just user, type 2 = just group and type = 3 both group and user.
                    if (predictionsType == 2) {
                        Map<String, Long> groupIdsSmilesTo = data.getGroupIdSmilesToPicks();
                        double groupIdSmiles = groupIdsSmilesTo.get(groupId.getKey().toString() + smilesTo.getKey());
                        structureDefinition[defIndex] = generateProbForOneGiven(userId.getValue(),
                                groupIdSmiles, smilesTo.getValue(), totalDecisions);
                    } else if (predictionsType == 3) {
                        Map<String, Long> userGroupSmilesTos = data.getUserIdGroupIdSmilesToPicks();
                        Map<String, Long> usersGroup = data.getUserIdGroupIdPicks();
                        double userGroupSmilesTo = userGroupSmilesTos.get(userId.getKey().toString() + groupId.getKey().toString() + smilesTo.getKey());
                        double userGroup = usersGroup.get(userId.getKey().toString() + groupId.getKey().toString());
                        structureDefinition[defIndex] = generateProbForOneGiven(userGroup,userGroupSmilesTo,smilesTo.getValue(), totalDecisions);
                    } else {
                        Map<String, Long> userIdsSmilesTo = data.getUserIdSmilesToPicks();
                        double userIdSmiles = userIdsSmilesTo.get(userId.getKey().toString() + smilesTo.getKey());
                        structureDefinition[defIndex] = generateProbForOneGiven(userId.getValue(),
                                userIdSmiles, smilesTo.getValue(), totalDecisions);
                    }
                    defIndex++;
                }
            }
        }
        network.setNodeDefinition(structureNodeName, structureDefinition);
    }

    private double generateProbForOneGiven(double knownValue, double jointValue,
                                           double smilesTo, double totalDecisions){
        // P(A | B) = ( P(B | A) * P(A) ) / P(B)
        double P_BGivenA =  jointValue / smilesTo;
        double P_A = smilesTo / totalDecisions;
        double P_B = knownValue / totalDecisions;
        // Prob of user/group one then it must just be the probability of it being the smile.
        if (P_B == 1) {
            return P_A;
        }else{
            return (P_BGivenA * P_A) / P_B;
        }
    }

    private double generateProbForTwoGiven(double user, double group, double GroupAndUserGivenSmiles,
                                           double smilesTo, double totalDecisions){
        // P(A | B, C ) = ( P(B, C | A) * P(A) ) / P(B, C)
        // P(B, C)  = P(B) * P(C)
        double P_BAndCGivenA = GroupAndUserGivenSmiles / smilesTo;
        double P_BAndC =  (group / totalDecisions) * (user / totalDecisions);
        double P_A = smilesTo / totalDecisions;
        // Prob of user/group one then it must just be the probability of it being the smile.
        if (P_BAndC == 1) {
            return P_A;
        }else{
            return (P_BAndCGivenA * P_A) / P_BAndC;
        }
    }

    public List<SmilesToProb> generateBestChoices(){

        Map<String, String> structNodeNameToSmiles = data.getStructNodeNameToSmiles();

        List<SmilesToProb> result = new ArrayList<>();
        double[] probs;
        // No next choice found, one result found or if user choice to make.
        if (structNodeNameToSmiles.size() == 0){
            return result;
        }else if(structNodeNameToSmiles.size() == 1){
            List<String> list = new ArrayList<>(structNodeNameToSmiles.values());
            result.add(new SmilesToProb(list.get(0), 1));
            return result;
        } else if (network.getNodeCount() > 1) {
            String nodes[] = network.getParentIds(structureNodeName);
            for (String node: nodes) {
                if (node.equals(userNodeName)){
                    network.setEvidence(userNodeName, userNodeStart + data.getUserId());
                }
                if (node.equals(groupNodeName)){
                    network.setEvidence(groupNodeName, groupNodeStart + data.getGroupId());
                }
            }
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
    