package maynooth.seefood.service;

import lombok.RequiredArgsConstructor;
import maynooth.seefood.mapper.RatingMapper;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.RatingPO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendService {
    @Autowired
    private RatingMapper ratingMapper;
    @Autowired
    private SeafoodMapper seafoodMapper;


    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(cacheNames = "recommendations", key = "#loginUser.userId")
    public boolean addUserBehavior(LoginUser loginUser, RatingPO ratingPO) {
        ratingPO.setUserId(loginUser.getUserId());
        // 1. 查询用户是否已对该物品有行为记录
        int count = ratingMapper.countByUserIdAndSeafoodId(
                loginUser.getUserId(),
                ratingPO.getSeafoodId()
        );

        if (count > 0) {
            // 2. 已有记录：累加权重（而非重复插入）
            int updateRows = ratingMapper.updateWeightByUserIdAndSeafoodId(
                    ratingPO.getUserId(),
                    ratingPO.getSeafoodId(),
                    ratingPO.getBehaviorWeight()
            );
            return updateRows > 0;
        } else {
            // 3. 无记录：插入新记录
            int insertRows = ratingMapper.insertRating(ratingPO);
            return insertRows > 0;
        }
    }

    /**
     * 步骤1：构建“用户-物品-总权重”映射（物品ID为int类型）
     */
    private Map<Long, Map<Integer, Integer>> getUserItemWeightMap() {
        List<RatingPO> pairs = ratingMapper.findAllUserItemWeightPairs();
        Map<Long, Map<Integer, Integer>> userItemWeightMap = new HashMap<>();

        for (RatingPO ratingPO : pairs) {
            Long userId = ratingPO.getUserId();
            Integer seafoodId = ratingPO.getSeafoodId();
            Integer weight = ratingPO.getBehaviorWeight();

            // 初始化用户的物品权重映射（物品ID为Integer）
            userItemWeightMap.computeIfAbsent(userId, k -> new HashMap<>());
            Map<Integer, Integer> itemWeightMap = userItemWeightMap.get(userId);

            // 同一用户对同一物品的多次行为，权重累加
            itemWeightMap.put(seafoodId, itemWeightMap.getOrDefault(seafoodId, 0) + weight);
        }
        return userItemWeightMap;
    }

    /**
     * 步骤2：计算加权Jaccard相似度（物品ID为Integer类型）
     * 加权Jaccard(A,B) = sum(min(w_Ai, w_Bi)) / sum(max(w_Ai, w_Bi))
     */
    private Map<Long, Map<Long, Double>> calculateWeightedJaccardSimilarity() {
        Map<Long, Map<Integer, Integer>> userItemWeightMap = getUserItemWeightMap();
        Map<Long, Map<Long, Double>> similarityMap = new HashMap<>();

        // 遍历所有用户对
        for (Long userIdA : userItemWeightMap.keySet()) {
            Map<Integer, Integer> itemWeightsA = userItemWeightMap.get(userIdA);
            Map<Long, Double> userSimilarity = new HashMap<>();

            for (Long userIdB : userItemWeightMap.keySet()) {
                if (userIdA.equals(userIdB)) {
                    continue; // 跳过自身
                }
                Map<Integer, Integer> itemWeightsB = userItemWeightMap.get(userIdB);

                // 计算加权交集和加权并集（直接用整型计算）
                int weightedIntersection = 0;
                int weightedUnion = 0;

                // 遍历用户A的所有物品（物品ID为Integer）
                for (Map.Entry<Integer, Integer> entry : itemWeightsA.entrySet()) {
                    Integer itemId = entry.getKey();
                    int weightA = entry.getValue();
                    int weightB = itemWeightsB.getOrDefault(itemId, 0);

                    weightedIntersection += Math.min(weightA, weightB);
                    weightedUnion += Math.max(weightA, weightB);
                }

                // 遍历用户B独有的物品（避免遗漏）
                for (Map.Entry<Integer, Integer> entry : itemWeightsB.entrySet()) {
                    Integer itemId = entry.getKey();
                    if (!itemWeightsA.containsKey(itemId)) {
                        weightedUnion += entry.getValue();
                    }
                }

                // 计算加权Jaccard相似度（避免除零）
                double similarity = weightedUnion == 0 ? 0 : (double) weightedIntersection / weightedUnion;
                userSimilarity.put(userIdB, similarity);
            }
            similarityMap.put(userIdA, userSimilarity);
        }
        return similarityMap;
    }

    /**
     * 步骤3：为指定用户推荐物品（物品ID为Integer类型）
     */
    @Cacheable(cacheNames = "recommendations", key = "#userId")
    public List<SeafoodPO> recommendItems(Long userId, int topN) {
        Map<Long, Map<Long, Double>> similarityMap = calculateWeightedJaccardSimilarity();
        if (!similarityMap.containsKey(userId)) {
            return Collections.emptyList();
            // 无交互记录的用户直接返回空
        }

        // 目标用户的物品权重映射（物品ID为Integer）
        Map<Long, Map<Integer, Integer>> userItemWeightMap = getUserItemWeightMap();
        Map<Integer, Integer> targetUserItems = userItemWeightMap.getOrDefault(userId, new HashMap<>());

        // 收集候选物品得分：相似用户的物品权重（整型） × 相似度（物品ID为Integer）
        Map<Integer, Double> itemScoreMap = new HashMap<>();
        Map<Long, Double> userSimilarities = similarityMap.get(userId);

        // 按相似度降序排序相似用户
        List<Map.Entry<Long, Double>> sortedSimilarUsers = userSimilarities.entrySet().stream()
                .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                .toList();

        // 遍历相似用户，计算物品得分
        for (Map.Entry<Long, Double> entry : sortedSimilarUsers) {
            Long similarUserId = entry.getKey();
            double similarity = entry.getValue();
            Map<Integer, Integer> similarUserItems = userItemWeightMap.get(similarUserId);

            if (similarUserItems == null) {
                continue; // 无交互记录的相似用户跳过
            }

            for (Map.Entry<Integer, Integer> itemEntry : similarUserItems.entrySet()) {
                Integer itemId = itemEntry.getKey();
                int itemWeight = itemEntry.getValue();

                // 目标用户未交互过的物品才推荐
                if (!targetUserItems.containsKey(itemId)) {
                    double score = itemWeight * similarity;
                    itemScoreMap.put(itemId, itemScoreMap.getOrDefault(itemId, 0.0) + score);
                }
            }
        }

        // 按得分降序取TopN并返回物品详情（物品ID为Integer）
        return itemScoreMap.entrySet().stream()
                .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                .limit(topN)
                .map(entry -> seafoodMapper.getSeafoodById(entry.getKey()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}