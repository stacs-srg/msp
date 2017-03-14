package com.index.RestParamaters;

/**
 * Created by jaco1a on 14/03/17.
 */
public class StudyStructuresDescription {

    private int numUserStructures;

    private int numOtherStructures;

    private int numOfGroups;


    public StudyStructuresDescription() {
        // Default
        numUserStructures = 4;
        numOtherStructures = 3;
        numOfGroups = 3;
    }

    public StudyStructuresDescription(int numUserStructures, int numOtherStructures, int numOfGroups) {
        this.numUserStructures = numUserStructures;
        this.numOtherStructures = numOtherStructures;
        this.numOfGroups = numOfGroups;
    }

    public int getNumUserStructures() {
        return numUserStructures;
    }

    public void setNumUserStructures(int numUserStructures) {
        this.numUserStructures = numUserStructures;
    }

    public int getNumOtherStructures() {
        return numOtherStructures;
    }

    public void setNumOtherStructures(int numOtherStructures) {
        this.numOtherStructures = numOtherStructures;
    }

    public int getNumOfGroups() {
        return numOfGroups;
    }

    public void setNumOfGroups(int numOfGroups) {
        this.numOfGroups = numOfGroups;
    }
}
