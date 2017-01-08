package com.index.repos;

import com.index.entitys.MetadataUser;
import com.index.entitys.MetadataUserKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Created by jacr on 07/01/17.
 */
@Repository
public interface MetadataUserRepo extends JpaRepository<MetadataUser, MetadataUserKey> {

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE MetadataUser m " +
            "SET m.times = m.times + 1 " +
            "WHERE m.metadataUserKey = ?1 ")
    void increment(MetadataUserKey metadataUserKey);
}
