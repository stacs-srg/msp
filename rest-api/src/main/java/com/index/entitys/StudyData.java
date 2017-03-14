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

    @Column(name = "group_id")
    private int groupId;

    @Column(name = "smiles")
    private String smiles;

    @Column(name = "smiles_drawn")
    private String smilesDrawn;

    @Column(name = "undos")
    private int undos;

    @Column(name = "rubs")
    private int rubs;

    @Column(name = "predictions_used")
    private Integer predictionsUsed;

    @Column(name = "prediction_type")
    private Integer predictionType;

    public StudyData(){

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

    public int getRubs() {
        return rubs;
    }

    public void setRubs(int rubs) {
        this.rubs = rubs;
    }

    public Integer getPredictionsUsed() {
        return predictionsUsed;
    }

    public void setPredictionsUsed(Integer predictionsUsed) {
        this.predictionsUsed = predictionsUsed;
    }

    public Integer getPredictionType() {
        return predictionType;
    }

    public void setPredictionType(Integer predictionType) {
        this.predictionType = predictionType;
    }

    public String getSmilesDrawn() {
        return smilesDrawn;
    }

    public void setSmilesDrawn(String smilesDrawn) {
        this.smilesDrawn = smilesDrawn;
    }

    public int getGroupId() {
        return groupId;
    }

    public void setGroupId(int groupId) {
        this.groupId = groupId;
    }
}
