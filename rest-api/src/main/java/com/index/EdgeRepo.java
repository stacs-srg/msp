package com.index;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Created by jacr on 04/01/17.
 */
@Repository
public interface EdgeRepo extends CrudRepository<Edge,EdgeKey> {

}

