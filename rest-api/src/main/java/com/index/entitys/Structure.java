package com.index.entitys;

import javax.persistence.*;
import javax.validation.constraints.Size;
import java.io.Serializable;
import java.util.ArrayList;

import org.jsondoc.core.annotation.ApiObjectField;
import org.jsondoc.core.annotation.ApiObject;

/**
 * Created by jaco1a on 22/12/16.
 */
@Entity
@ApiObject
public class Structure implements Serializable{

    @Id
    @ApiObjectField(description = "SMILES string of object")
    @Column
    private String smiles;

    @Column(length = 1000000)
    @ApiObjectField(description = "Molfile of object")
    private String mol;

    @Column
    @ApiObjectField(description = "boolean if end structure")
    private int end;

    public String getSmiles() {
        return smiles;
    }

    public void setSmiles(String smiles) {
        this.smiles = smiles;
    }

    public String getMol() {
        return mol;
    }

    public void setMol(String mol) {
        this.mol = mol;
    }

    public int getEnd() {
        return end;
    }

    public void setEnd(int end) {
        this.end = end;
    }
}
