package com.index.Respones;

import com.index.RestParamaters.StudyStructuresDescription;
import com.index.entitys.Structure;
import com.index.exceptions.NotEnoughDataForStudyException;

import java.util.*;

/**
 * Created by jaco1a on 13/03/17.
 */
public class StructuresPredictionTypes {

    private List<Structure> structures;

    private List<Integer> types;

    public StructuresPredictionTypes(List<Structure> userStructures, List<Structure> otherStructures, StudyStructuresDescription description) throws NotEnoughDataForStudyException {

        int numUserStructures = description.getNumUserStructures();
        int numOtherStructures = description.getNumOtherStructures();
        int numOfGroups = description.getNumOfGroups();

        if (userStructures.size() < numUserStructures ||
                otherStructures.size() < numOtherStructures){
            throw new NotEnoughDataForStudyException();
        }
        types = new ArrayList<>();
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
        // Put the same structures into the list given the number of groups and add a type number for each.
        for(int i = 0; i < numOfGroups; i++) {
            for(int j = 0; j < structuresSize; j++) {
                if (i < numOfGroups - 1){
                    structures.add(structures.get(j));
                }
                types.add(i);
            }
        }
        // Random Seed the same. Will shuffle the values the same way.
        seed = System.nanoTime();
        Random r = new Random(seed);
        Collections.shuffle(structures, r);
        r = new Random(seed);
        Collections.shuffle(types, r);
    }

    public List<Structure> getStructures() {
        return structures;
    }

    public List<Integer> getTypes() {
        return types;
    }
}
