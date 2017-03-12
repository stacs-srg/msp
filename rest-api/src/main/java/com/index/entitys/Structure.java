package com.index.entitys;

import javax.persistence.*;
import javax.validation.constraints.Size;
import java.io.Serializable;
import java.util.ArrayList;


/**
 * Created by jaco1a on 22/12/16.
 */
@Entity
public class Structure implements Serializable{

    @Id
    @Column
    private String smiles;

    @Column(length = 2000)
    private String mol;

    @Column
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
