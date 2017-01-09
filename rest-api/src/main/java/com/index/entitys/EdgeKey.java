package com.index.entitys;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

/**
 * Created by jacr on 04/01/17.
 */
@Embeddable
public class EdgeKey implements Serializable {

    @Column(name = "smiles_to")
    private String smilesTo;

    @Column(name = "smiles_from")
    private String smilesFrom;

    public EdgeKey(){

    }

    public EdgeKey(String smilesTo, String smilesFrom){
        this.smilesTo = smilesTo;
        this.smilesFrom = smilesFrom;
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