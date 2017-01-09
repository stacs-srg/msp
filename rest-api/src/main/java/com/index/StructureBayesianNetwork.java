package com.index;

import com.index.entitys.Edge;
import com.index.entitys.EdgeMetadata;
import smile.Network;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by jacr on 08/01/17.
 */
public class StructureBayesianNetwork {

    Network network;
    List<EdgeMetadata> edgeMetadata;

    // pass repo in

    public StructureBayesianNetwork(List<EdgeMetadata> edges){
        this.network = new Network();
        this.edgeMetadata = edges;
        // query for edges for given smile
        // loop round add struct node
        network.addNode(Network.NodeType.Cpt, "structureChoice");
    }

    public List<Edge> generateBestChoices(){
        List<Edge> result = new ArrayList<>();
        for (EdgeMetadata meta : edgeMetadata){
            result.add(meta.getEdge());
        }
        return result;
    }
}
