package com.index.entitys;

import javax.persistence.*;
import java.util.Date;

/**
 * Created by jaco1a on 07/03/17.
 */
@Entity
@Table(name = "study_data")
public class StudyData {

    @Id
    @Column(name = "start_time")
    private Date startTime;

    @Column(name = "endTime")
    private Date endTime;

    @Column(name = "user_id")
    private int userId;

    @Column(name = "smiles")
    private String smiles;

    @Column(name = "undos")
    private int undos;


    public StudyData(){

    }

    public StudyData(Date startTime, Date endTime, String smiles, int userId, int undos) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.userId = userId;
        this.smiles = smiles;
        this.undos = undos;
    }

    public Date getStartTime() {
        return startTime;
    }

    public void setStartTime(Date startTime) {
        this.startTime = startTime;
    }

    public Date getEndTime() {
        return endTime;
    }

    public void setEndTime(Date endTime) {
        this.endTime = endTime;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getSmiles() {
        return smiles;
    }

    public void setSmiles(String smiles) {
        this.smiles = smiles;
    }

    public int getUndos() {
        return undos;
    }

    public void setUndos(int undos) {
        this.undos = undos;
    }
}
