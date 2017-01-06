package com.index.repos;

import com.index.entitys.Edge;
import com.index.entitys.EdgeKey;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Created by jacr on 04/01/17.
 */
@Repository
public interface EdgeRepo extends CrudRepository<Edge,EdgeKey> {

}

