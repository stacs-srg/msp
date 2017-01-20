package com.index;

import com.index.entitys.EdgeMetadata;
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

    static final String structureNodeStart = "struct_";

    private BayesianNetworkData data;

    private Network network;


    public StructureBayesianNetwork(BayesianNetworkData data){

        this.data = data;

        // No choices to make currently OR
        // only one choice can be made that is the answer.
        if (data.getTotalDecisions() == null || data.getTotalDecisions() == 0 || data.getSmilesToTotalPicks().size() == 1){
            return;
        }

        this.network = new Network();
        network.addNode(Network.NodeType.Cpt, structureNodeName);
        network.addNode(Network.NodeType.Cpt, userNodeName);

        addOutcomesToNetwork();
        // || data.getUserIdTotalDecisions().get(data.getUserId()) == null
        if(data.getUserIdTotalDecisions().size() == 1 ){
            // No need for user node as no choice to be made!
            network.deleteNode(userNodeName);
        }else{
            // By default the node must have two outcomes. Remove the default outcomes.
            network.deleteOutcome(userNodeName, 0);
            network.deleteOutcome(userNodeName, 0);
            setUserNodeDef();
            network.addArc(userNodeName, structureNodeName);
        }
        // remove the default structures.
        network.deleteOutcome(structureNodeName, 0);
        network.deleteOutcome(structureNodeName, 0);
        setStructureChoiceDef();
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
    }

    private void setUserNodeDef(){
        double[] userDefinition = new double[data.getUserIdTotalDecisions().size()];
        int i = 0;
        for(Map.Entry<Integer, Long> userEntry : data.getUserIdTotalDecisions().entrySet()){
            // The number of times a user has made a choice / total times a choice has been made.
            userDefinition[i++] = (double) userEntry.getValue() / (double) data.getTotalDecisions();
        }
        network.setNodeDefinition(userNodeName, userDefinition);
    }

    private void setStructureChoiceDef(){

        List<EdgeMetadata> edges = data.getEdges();
        Map<String, Long> smilesTos = data.getSmilesToTotalPicks();
        Map<Integer, Long> userIds = data.getUserIdTotalDecisions();

        double totalDecisions = data.getTotalDecisions();

        double[] structureDefinition = new double[edges.size()];
        int defIndex = 0;
        for (EdgeMetadata edge : edges) {

            System.out.print("(2) smile From: " + edge.getEdgeMetadataKey().getSmilesFrom());
            System.out.print(" smile To: " + edge.getEdgeMetadataKey().getSmilesTo());
            System.out.println(" User: " + edge.getEdgeMetadataKey().getUserId());

            double smilesToTotalPicks = smilesTos.get(edge.getSmilesTo());
            double userTotalPicks = userIds.get(edge.getUserId());

            // P(A | B) = ( P(B | A) * P(A) ) / P(B)
            double probOfThisUserGivenThisSmileTo = (double) edge.getTimes() / smilesToTotalPicks;
            double probOfThisSmileTo = smilesToTotalPicks / totalDecisions;
            double probOfThisUser = userTotalPicks / totalDecisions;

            System.out.print("probOfThisSmileTo " + probOfThisSmileTo);
            System.out.print(" probOfThisUserGivenThisSmileTo: " + probOfThisUserGivenThisSmileTo);
            System.out.println(" probOfThisUser: " + probOfThisUser);

            if (probOfThisUser != 1) {
                structureDefinition[defIndex] = (probOfThisUserGivenThisSmileTo * probOfThisSmileTo) / probOfThisUser;
            }else{
                structureDefinition[defIndex] = probOfThisSmileTo;
            }
            defIndex++;
        }
        network.setNodeDefinition(structureNodeName, structureDefinition);
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
            result.add(new SmilesToProb(list.get(0), 0));
            return result;
        } else if (network.getNodeCount() > 1) {
            network.setEvidence(userNodeName, userNodeStart + data.getUserId());
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
