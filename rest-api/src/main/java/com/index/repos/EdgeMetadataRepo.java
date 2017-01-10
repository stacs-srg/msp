package com.index.repos;

import com.index.entitys.EdgeMetadata;
import com.index.entitys.EdgeMetadataKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Created by jacr on 07/01/17.
 */
@Repository
public interface EdgeMetadataRepo extends JpaRepository<EdgeMetadata, EdgeMetadataKey> {

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE EdgeMetadata m " +
            "SET m.times = m.times + 1 " +
            "WHERE m.edgeMetadataKey = ?1 ")
    void increment(EdgeMetadataKey edgeMetadataKey);

    @Query("SELECT m FROM EdgeMetadata m " +
            "WHERE m.edgeMetadataKey.smilesFrom = ?1")
    List<EdgeMetadata> findBySmilesFrom(String smilesFrom);
}