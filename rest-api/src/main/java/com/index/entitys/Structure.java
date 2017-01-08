package com.index.entitys;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import java.io.Serializable;


/**
 * Created by jaco1a on 22/12/16.
 */
@Entity
public class Structure implements Serializable{

    @Id
    @Column
    private String smiles;

    @Column
    private String mol;

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

}
