package com.index.Respones;

import com.index.entitys.Structure;

import java.io.Serializable;
import java.util.List;

/**
 * Created by jaco1a on 21/01/17.
 */
public class StructurePrediction implements Serializable{

    private List<String> path;

    private Structure endStructure;

    private double probability;

    public StructurePrediction(List<String> path, Structure endStructure, double probability) {
        this.path = path;
        this.endStructure = endStructure;
        this.probability = probability;
    }

    public List<String> getPath() {
        return path;
    }

    public Structure getEndStructure() {
        return endStructure;
    }

    public double getProbability() {
        return probability;
    }
}
