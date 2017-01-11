package com.index.entitys;



import javax.persistence.*;
import java.util.List;

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

    public Edge(String smilesTo, String smilesFrom){
        this.edgeKey = new EdgeKey(smilesTo, smilesFrom);
    }

    public EdgeKey getEdgeKey() {
        return edgeKey;
    }

    public void setEdgeKey(EdgeKey edgeKey) {
        this.edgeKey = edgeKey;
    }
}

