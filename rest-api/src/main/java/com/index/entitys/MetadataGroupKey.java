package com.index.entitys;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

/**
 * Created by jacr on 07/01/17.
 */
@Embeddable
public class MetadataGroupKey implements Serializable{

    @Column
    private int groupId;

    @Column
    private String smilesTo;

    @Column
    private String smilesFrom;

    public MetadataGroupKey(){

    }

    public MetadataGroupKey(int groupId, String smilesTo, String smilesFrom) {
        this.groupId = groupId;
        this.smilesTo = smilesTo;
        this.smilesFrom = smilesFrom;
    }

    public int getGroupId() {
        return groupId;
    }

    public void setGroupId(int groupId) {
        this.groupId = groupId;
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
