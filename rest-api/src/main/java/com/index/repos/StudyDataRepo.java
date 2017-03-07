package com.index.repos;

import com.index.entitys.StudyData;
import org.springframework.data.repository.CrudRepository;

import java.util.Date;

/**
 * Created by jaco1a on 07/03/17.
 */
public interface StudyDataRepo extends CrudRepository<StudyData,Date> {

}
