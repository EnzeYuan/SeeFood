package maynooth.seefood.mapper;

import maynooth.seefood.pojo.PO.SeafoodPO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;


import java.util.List;

@Mapper
@Repository
public interface SeafoodMapper {

    //更新浏览量
    int putViews(int seafoodId);

    //get popular list
    List<SeafoodPO> getSeafoodInPopularity();

    //getById
    SeafoodPO getSeafoodById(int seafoodId);

    //getBySeason
    List<SeafoodPO> getSeafoodBySeason(int month);

    //get by tag
    List<SeafoodPO> getSeafoodByTag(String tag);

    //put like
    int putLike(int seafoodId,long userId);

    //delete like
    int deleteLike(int seafoodId,long userId);

    //add seafood
    int addSeafood(SeafoodPO seafoodPO);

}
