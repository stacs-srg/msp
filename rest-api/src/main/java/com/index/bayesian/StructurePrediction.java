package com.index.bayesian;

import com.index.entitys.Structure;

import java.io.Serializable;
import java.util.List;

/**
 * Created by jaco1a on 21/01/17.
 */
public class StructurePrediction implements Serializable{

    List<String> path;

    Structure endStructure;

    public StructurePrediction(List<String> path, Structure endStructure) {
        this.path = path;
        this.endStructure = endStructure;
    }

    public List<String> getPath() {
        return path;
    }

    public Structure getEndStructure() {
        return endStructure;
    }
}
