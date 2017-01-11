package com.index.repos;

/**
 * Created by jaco1a on 11/01/17.
 */
public class SmilesToProb implements Comparable<SmilesToProb>{

    private String smilesTo;

    private double probability;

    public int compareTo(SmilesToProb other) {
        return (this.probability > other.probability) ? -1 : (this.probability < other.probability) ? 1 : 0 ;
    }

    public SmilesToProb(String smilesTo, double probability) {
        this.smilesTo = smilesTo;
        this.probability = probability;
    }

    public String getSmilesTo() {
        return smilesTo;
    }

    public void setSmilesTo(String smilesTo) {
        this.smilesTo = smilesTo;
    }

    public double getProbability() {
        return probability;
    }

    public void setProbability(double probability) {
        this.probability = probability;
    }
}
