package com.index.entitys;

import javax.persistence.*;
import java.util.Date;

/**
 * Created by jacr on 07/01/17.
 */
@Entity
@Table(name = "metadata_group")
public class MetadataGroup {

    @EmbeddedId
    private MetadataGroupKey metadataGroupKey;

    @Column
    private int times;

    @Column
    private Date lastDate;

    public MetadataGroup() {

    }

    public MetadataGroup(int groupId, String smilesTo, String smilesFrom) {
        this.metadataGroupKey = new MetadataGroupKey(groupId, smilesTo, smilesFrom);
    }

    @PrePersist
    protected void onCreate() {
        lastDate = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        lastDate = new Date();
    }

    public MetadataGroupKey getMetadataGroupKey() {
        return metadataGroupKey;
    }

    public void setMetadataGroupKey(MetadataGroupKey metadataGroupKey) {
        this.metadataGroupKey = metadataGroupKey;
    }

    public int getTimes() {
        return times;
    }

    public void setTimes(int times) {
        this.times = times;
    }

    public Date getLastDate() {
        return lastDate;
    }

    public void setLastDate(Date lastDate) {
        this.lastDate = lastDate;
    }
}
