package com.index.entitys;

import javax.persistence.*;
import java.util.Date;

/**
 * Created by jacr on 07/01/17.
 */
@Entity
@Table(name = "metadata_user")
public class MetadataUser {


    @EmbeddedId
    private MetadataUserKey metadataUserKey;

    @Column
    private int times;

    @Column
    private Date lastDate;

    public MetadataUser() {

    }

    public MetadataUser(int userId, String smilesTo, String smilesFrom) {
        this.metadataUserKey = new MetadataUserKey(userId, smilesTo, smilesFrom);
    }

    @PrePersist
    protected void onCreate() {
        lastDate = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        lastDate = new Date();
    }

    public MetadataUserKey getMetadataUserKey() {
        return metadataUserKey;
    }

    public void setMetadataUserKey(MetadataUserKey metadataUserKey) {
        this.metadataUserKey = metadataUserKey;
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
