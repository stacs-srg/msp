package com.index.entitys;



import javax.persistence.EmbeddedId;
import javax.persistence.Entity;
import javax.persistence.Table;

/**
 * Created by jacr on 04/01/17.
 */
@Entity
@Table(name = "edge")
public class Edge {

    @EmbeddedId
    private EdgeKey edgeKey;

    public Edge(){

    }

    public Edge(String smileTo, String smileFrom){
        this.edgeKey = new EdgeKey(smileTo, smileFrom);
    }

    public EdgeKey getEdgeKey() {
        return edgeKey;
    }

    public void setEdgeKey(EdgeKey edgeKey) {
        this.edgeKey = edgeKey;
    }
}

