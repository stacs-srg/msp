package com.index.entitys;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

/**
 * Created by jacr on 07/01/17.
 */
@Embeddable
public class MetadataUserKey implements Serializable {

    @Column
    private int userId;

    @Column
    private String smilesTo;

    @Column
    private String smilesFrom;

    public MetadataUserKey(){

    }

    public MetadataUserKey(int userId, String smilesTo, String smilesFrom) {
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
