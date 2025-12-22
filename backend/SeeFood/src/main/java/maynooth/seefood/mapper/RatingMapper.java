package maynooth.seefood.mapper;

import maynooth.seefood.pojo.PO.RatingPO;
import org.apache.ibatis.annotations.*;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface RatingMapper {

    List<RatingPO> findAllUserItemWeightPairs();


    int insertRating(RatingPO ratingPO);

    @Select("SELECT COUNT(*) FROM rating WHERE userId = #{userId} AND seafoodId = #{seafoodId}")
    int countByUserIdAndSeafoodId(@Param("userId") Long userId, @Param("seafoodId") Integer seafoodId);

    @Update("UPDATE rating SET behaviorWeight = behaviorWeight + #{addWeight} " +
            "WHERE userId = #{userId} AND seafoodId = #{seafoodId}")
    int updateWeightByUserIdAndSeafoodId(
            @Param("userId") Long userId,
            @Param("seafoodId") Integer seafoodId,
            @Param("addWeight") Integer addWeight);
}
