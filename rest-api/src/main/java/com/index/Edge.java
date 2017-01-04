package com.index;


import javax.persistence.EmbeddedId;
import javax.persistence.Entity;

/**
 * Created by jacr on 04/01/17.
 */
@Entity
public class Edge {

    @EmbeddedId
    private EdgeKey edgeKey;

    public Edge(){

    }

    public Edge(EdgeKey edgeKey){
        this.edgeKey = edgeKey;
    }

    public EdgeKey getEdgeKey() {
        return edgeKey;
    }

    public void setEdgeKey(EdgeKey edgeKey) {
        this.edgeKey = edgeKey;
    }
}

