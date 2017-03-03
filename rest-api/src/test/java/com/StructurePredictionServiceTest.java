package com;

import com.index.StructurePredictionService;
import com.index.entitys.Structure;
import org.junit.Test;

import java.util.ArrayList;

import static org.junit.Assert.assertTrue;


/**
 * Created by jaco1a on 26/02/17.
 */
public class StructurePredictionServiceTest {

    StructurePredictionService testee = new StructurePredictionService();

    @Test
    public void cleanPathSimpleText(){

        Structure s1 = new Structure();
        s1.setSmiles("s1");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 1);
    }

    @Test
    public void cleanPathSimpleRepeat(){

        Structure s1 = new Structure();
        s1.setSmiles("s1");
        Structure s2 = new Structure();
        s2.setSmiles("s1");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);
        structures.add(s2);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 1);
    }

    @Test
    public void cleanPathDoubleRepeat() {

        Structure s1 = new Structure();
        s1.setSmiles("s1");
        Structure s2 = new Structure();
        s2.setSmiles("s1");
        Structure s3 = new Structure();
        s3.setSmiles("s1");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);
        structures.add(s2);
        structures.add(s3);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 1);
    }

    @Test
    public void cleanPathNone() {

        Structure s1 = new Structure();
        s1.setSmiles("s1");
        Structure s2 = new Structure();
        s2.setSmiles("s2");
        Structure s3 = new Structure();
        s3.setSmiles("s3");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);
        structures.add(s2);
        structures.add(s3);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 3);
    }

    @Test
    public void cleanPathUndoInPath() {

        Structure s1 = new Structure();
        s1.setSmiles("s1");
        Structure s2 = new Structure();
        s2.setSmiles("s2");
        Structure s3 = new Structure();
        s3.setSmiles("s1");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);
        structures.add(s2);
        structures.add(s3);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 1);
    }

    @Test
    public void cleanPathUndoRedoInPath() {

        Structure s1 = new Structure();
        s1.setSmiles("s1");
        Structure s2 = new Structure();
        s2.setSmiles("s2");
        Structure s3 = new Structure();
        s3.setSmiles("s1");
        Structure s4 = new Structure();
        s4.setSmiles("s2");

        ArrayList<Structure> structures = new ArrayList<>();
        structures.add(s1);
        structures.add(s2);
        structures.add(s3);
        structures.add(s4);

        structures = testee.cleanPath(structures);
        assertTrue(structures.size() == 2);
    }
}
