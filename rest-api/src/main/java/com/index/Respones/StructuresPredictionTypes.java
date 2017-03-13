package com.index.Respones;

import com.index.entitys.Structure;
import com.index.exceptions.NotEnoughDataForStudyException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * Created by jaco1a on 13/03/17.
 */
public class StructuresPredictionTypes {

    private static final int numUserStructures = 4;

    private static final int numOtherStructures = 3;

    private static final int numOfGroups = 3;

    private List<Structure> structures;

    private List<Integer> types;

    public StructuresPredictionTypes(List<Structure> userStructures, List<Structure> otherStructures) throws NotEnoughDataForStudyException {

        if (userStructures.size() < numUserStructures ||
                otherStructures.size() < numOtherStructures){
            throw new NotEnoughDataForStudyException();
        }

        structures = new ArrayList<>();
        long seed = System.nanoTime();
        Collections.shuffle(userStructures, new Random(seed));
        Collections.shuffle(otherStructures, new Random(seed));

        for(int i = 0; i < numUserStructures; i++){
            structures.add(userStructures.get(i));
        }
        for(int i = 0; i < numOtherStructures; i++){
            structures.add(otherStructures.get(i));
        }
        int structuresSize = structures.size();
        for(int i = 0; i < numOfGroups - 1; i++) {
            for(int j = 0; j < structuresSize; j++) {
                structures.add(structures.get(j));
            }
        }
        this.types = new ArrayList<>();
        for(int i = 0; i < numOfGroups; i++) {
            for(int j = 0; j < structuresSize; j++) {
                types.add(i + 1);
            }
        }
    }

    public List<Structure> getStructures() {
        return structures;
    }

    public List<Integer> getTypes() {
        return types;
    }
}
