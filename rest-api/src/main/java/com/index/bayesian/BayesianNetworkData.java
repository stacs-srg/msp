package com.index.bayesian;

import com.index.entitys.EdgeMetadata;
import com.index.repos.EdgeMetadataRepo;

import java.util.*;

import static com.index.bayesian.StructureBayesianNetwork.structureNodeStart;

/**
 * Created by jaco1a on 19/01/17.
 */
public class BayesianNetworkData {

    private long totalDecisions;

    private Map<Integer, Long> userIdTotalDecisions;

    private Map<Integer, Long> groupIdTotalDecisions;

    private Map<String, Long> smilesToTotalPicks;

    private Map<String, Long> userIdSmilesToPicks;

    private Map<String, Long> groupIdSmilesToPicks;

    // required as node names cannot have special characters in node names.
    private Map<String, String> structNodeNameToSmiles;

    private int userId;

    private int groupId;

    public BayesianNetworkData(String smilesFrom, EdgeMetadataRepo repo, int userId, int groupId){

        this.userId = userId;
        this.groupId = groupId;

        smilesToTotalPicks = new LinkedHashMap<>();
        groupIdTotalDecisions = new LinkedHashMap<>();
        userIdTotalDecisions = new LinkedHashMap<>();

        userIdSmilesToPicks = new HashMap<>();
        groupIdSmilesToPicks = new HashMap<>();

        totalDecisions = 0;

        structNodeNameToSmiles = new HashMap<>();

        List<EdgeMetadata> edges = repo.findBySmilesFrom(smilesFrom);

        List<String> smilesTos = repo.findBySmilesFromAllSmilesTo(smilesFrom);
        List<Integer> userIds = repo.findBySmilesFromAllUsers(smilesFrom);
        List<Integer> groupIds = repo.findBySmilesFromAllGroups(smilesFrom);

        if (!userIds.contains(userId)){
            userIds.add(userId);
            Collections.sort(userIds);
        }
        if (!groupIds.contains(groupId)){
            groupIds.add(groupId);
            Collections.sort(groupIds);
        }

        setUpData(userIds, smilesTos, groupIds, edges);

        System.out.println();
    }

    private void setUpData(List<Integer> userIds, List<String> smilesTos, List<Integer> groupIds, List<EdgeMetadata> edges){

        int index = 0;
        int times;
        int structIndex = 0;
        boolean first = true;
        for (Integer userId : userIds) {
            for(Integer groupId: groupIds) {
                for (String smilesTo : smilesTos) {
                    // if you have run out of edges for the current user
                    // OR the edge's userId does not match the current user
                    // OR the edge's groupId does not match the current groupId
                    // OR the edge to does not equal then an edge it should be.
                    EdgeMetadata edge = (index < edges.size()) ? edges.get(index) : null;
                    if (edge == null || userId != edge.getUserId() || groupId != edge.getGroupId()
                            || smilesTo.compareTo(edge.getSmilesTo()) != 0) {
                        times = 1;
                    } else {
                        times = edge.getTimes() + 1;
                        index++;
                    }

                    if (first){
                        structNodeNameToSmiles.put(structureNodeStart + structIndex++, smilesTo);
                    }
                    // Builds up the information required for the network.
                    addTimesToMap(smilesToTotalPicks, smilesTo, times);
                    addTimesToMap(groupIdTotalDecisions, groupId, times);
                    addTimesToMap(userIdTotalDecisions, userId, times);
                    addTimesToMap(userIdSmilesToPicks, userId.toString()+smilesTo, times);
                    addTimesToMap(groupIdSmilesToPicks, groupId.toString()+smilesTo, times);
                    totalDecisions += times;
                }
                first = false;
            }
        }
    }

    private void addTimesToMap(Map<Integer, Long> map, Integer key, long times){
        if (map.containsKey(key)){
            map.put(key, map.get(key) + times);
        }else{
            map.put(key, times);
        }
    }

    private void addTimesToMap(Map<String, Long> map, String key, long times){
        if (map.containsKey(key)){
            map.put(key, map.get(key) + times);
        }else{
            map.put(key, times);
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

    public Map<String, String> getStructNodeNameToSmiles() {
        return structNodeNameToSmiles;
    }

    public Map<Integer, Long> getGroupIdTotalDecisions() {
        return groupIdTotalDecisions;
    }


    public Map<String, Long> getGroupIdSmilesToPicks() {
        return groupIdSmilesToPicks;
    }

    public Map<String, Long> getUserIdSmilesToPicks() {
        return userIdSmilesToPicks;
    }

    public int getUserId() {
        return userId;
    }

    public int getGroupId() {
        return groupId;
    }
}
