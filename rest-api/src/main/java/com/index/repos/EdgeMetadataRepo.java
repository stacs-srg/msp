package com.index.repos;

import com.index.entitys.EdgeMetadata;
import com.index.entitys.EdgeMetadataKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
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
            "WHERE m.edgeMetadataKey.smilesFrom = ?1 " +
            "ORDER BY m.edgeMetadataKey.userId ASC, m.edgeMetadataKey.smilesTo")
    List<EdgeMetadata> findBySmilesFrom(String smilesFrom);

    @Query("SELECT m.edgeMetadataKey.userId, SUM(m.times) AS totalChoicesMade " +
            "FROM EdgeMetadata m " +
            "WHERE m.edgeMetadataKey.smilesFrom = ?1 " +
            "GROUP BY m.edgeMetadataKey.userId " +
            "ORDER BY m.edgeMetadataKey.userId ASC")
    List<Object[]> findBySmilesFromAllUsersAndTotalChoicesMade(String smilesFrom);

    @Query("SELECT m.edgeMetadataKey.smilesTo, SUM(m.times) As totalTimesPicked " +
            "FROM EdgeMetadata m " +
            "WHERE m.edgeMetadataKey.smilesFrom = ?1 " +
            "GROUP BY m.edgeMetadataKey.smilesTo " +
            "ORDER BY m.edgeMetadataKey.smilesTo ")
    List<Object[]> findBySmilesFromAllSmilesToAndTotalTimesPicked(String smilesFrom);

    @Query("SELECT SUM(m.times) As total " +
            "FROM EdgeMetadata m " +
            "WHERE m.edgeMetadataKey.smilesFrom = ?1 " +
            "GROUP BY m.edgeMetadataKey.smilesFrom ")
   Long findBySmilesFromTotalRows(String smilesFrom);
}
