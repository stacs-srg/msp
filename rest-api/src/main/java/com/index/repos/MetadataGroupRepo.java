package com.index.repos;

import com.index.entitys.MetadataGroup;
import com.index.entitys.MetadataGroupKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Created by jacr on 07/01/17.
 */
@Repository
public interface MetadataGroupRepo extends JpaRepository<MetadataGroup, MetadataGroupKey> {

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE MetadataGroup m " +
            "SET m.times = m.times + 1 " +
            "WHERE m.metadataGroupKey = ?1 ")
    void increment(MetadataGroupKey metadataGroupKey);
}