package maynooth.seefood.mapper;

import maynooth.seefood.pojo.PO.UserPO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface UserMapper {

    //registration
    int insert(UserPO user);

    //get user by name
    UserPO selectUserByUserName(String username);

    //get likes
    List<SeafoodPO> getLike(long userId);

    //update money
    int updateMoney(String username,double money);

}
