package com.index;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Created by jaco1a on 22/12/16.
 */
@Repository
public interface StructureRepo extends CrudRepository<Structure,String> {
}
