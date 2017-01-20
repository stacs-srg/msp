package com.index;

import com.index.entitys.EdgeMetadata;
import com.index.repos.EdgeMetadataRepo;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Created by jaco1a on 19/01/17.
 */
public class BayesianNetworkData {

    private Long totalDecisions;

    private Map<Integer, Long> userIdTotalDecisions;

    private Map<String, Long> smilesToTotalPicks;

    private List<EdgeMetadata> edges;

    // required as node names cannot be have special characters in node names.
    private Map<String, String> structNodeNameToSmiles;

    private int userId;

    //TODO repeat userIds but change to be groupIds
    private int groupId;

    public BayesianNetworkData(String smilesFrom, EdgeMetadataRepo repo, int userId, int groupId){

        this.userId = userId;
        this.groupId = groupId;
        smilesToTotalPicks = new LinkedHashMap<>();
        userIdTotalDecisions = new LinkedHashMap<>();
        structNodeNameToSmiles = new HashMap<>();
        totalDecisions = repo.findBySmilesFromTotalRows(smilesFrom);
        edges = repo.findBySmilesFrom(smilesFrom);

        List<Object[]> userIds = repo.findBySmilesFromAllUsersAndTotalChoicesMade(smilesFrom);
        List<Object[]> smilesTos = repo.findBySmilesFromAllSmilesToAndTotalTimesPicked(smilesFrom);

        setUpData(userIds, smilesTos, smilesFrom);
        checkUserIsIncluded(smilesFrom);
    }

    private void checkUserIsIncluded(String smilesFrom){

        if (userIdTotalDecisions.size() > 0 && userIdTotalDecisions.get(userId) == null){

            long times = 0;

            for (Map.Entry<String, Long> struct : smilesToTotalPicks.entrySet()) {

                String smilesTo = struct.getKey();

                EdgeMetadata metadata = new EdgeMetadata(userId, smilesFrom, smilesTo, 0);
                metadata.setTimes(1);
                edges.add(metadata);
                smilesToTotalPicks.put(smilesTo, smilesToTotalPicks.get(smilesTo) + 1);
                times++;
                totalDecisions++;
            }
            userIdTotalDecisions.put(userId, times);
        }
    }

    private void setUpData(List<Object[]> userIds, List<Object[]> smilesTos, String smilesFrom){

        boolean firstLoop = true;
        int index = 0;
        for (Object[] userIdInfo : userIds) {

            int userId = (int) userIdInfo[0];
            userIdTotalDecisions.put(userId, (long) userIdInfo[1]);

            for (Object[] smilesToInfo : smilesTos) {

                String smilesTo = (String) smilesToInfo[0];
                if (firstLoop) {
                    // add smilesTo into data structures required.
                    structNodeNameToSmiles.put(StructureBayesianNetwork.structureNodeStart + index, smilesTo);
                    smilesToTotalPicks.put(smilesTo, (long) smilesToInfo[1]);
                }
                // if you have run out of edges for the current user
                // OR the edge's userId does not match the current user
                // OR the edge to does not equal then an edge it should be.
                EdgeMetadata edge = (index < edges.size()) ? edges.get(index) : null ;
                if (edge == null || userId != edge.getUserId()
                        || smilesTo.compareTo(edge.getSmilesTo()) != 0) {
                    // TODO group id
                    edge = new EdgeMetadata(userId, smilesFrom, smilesTo, 0);
                    edges.add(index, edge);
                }

                // Increment all values by one to make the default chance of something being picked to one.
                edge.setTimes(edge.getTimes() + 1);
                userIdTotalDecisions.put(userId, userIdTotalDecisions.get(userId) + 1);
                smilesToTotalPicks.put(smilesTo, smilesToTotalPicks.get(smilesTo) + 1);
                totalDecisions++;

                index++;
            }
            firstLoop = false;
        }
    }

    public Long getTotalDecisions() {
        return totalDecisions;
    }

    public Map<Integer, Long> getUserIdTotalDecisions() {
        return userIdTotalDecisions;
    }

    public Map<String, Long> getSmilesToTotalPicks() {
        return smilesToTotalPicks;
    }

    public List<EdgeMetadata> getEdges() {
        return edges;
    }

    public Map<String, String> getStructNodeNameToSmiles() {
        return structNodeNameToSmiles;
    }

    public int getUserId() {
        return userId;
    }

    public int getGroupId() {
        return groupId;
    }
}
