package com.index.entitys;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

/**
 * Created by jacr on 07/01/17.
 */
@Embeddable
public class EdgeMetadataKey implements Serializable {

    @Column(name = "user_id")
    private int userId;

    @Column(name = "smiles_to")
    private String smilesTo;

    @Column(name = "smiles_from")
    private String smilesFrom;

    public EdgeMetadataKey(){

    }

    public EdgeMetadataKey(int userId, String smilesTo, String smilesFrom) {
        this.userId = userId;
        this.smilesTo = smilesTo;
        this.smilesFrom = smilesFrom;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getSmilesTo() {
        return smilesTo;
    }

    public void setSmilesTo(String smilesTo) {
        this.smilesTo = smilesTo;
    }

    public String getSmilesFrom() {
        return smilesFrom;
    }

    public void setSmilesFrom(String smilesFrom) {
        this.smilesFrom = smilesFrom;
    }
}
