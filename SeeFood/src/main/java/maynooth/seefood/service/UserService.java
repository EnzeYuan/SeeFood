package maynooth.seefood.service;

import maynooth.seefood.pojo.DTO.UserDTO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;

import java.util.List;

public interface UserService {

    Result register(UserPO userPO);

    List<SeafoodPO> getLikes(long userId);

    UserPO selectUserByUserName(String username);

    List<SeafoodPO> getPersonal();

    UserDTO getUserInfo();

    int putLike(int seafoodId);

    int deleteLike(int seafoodId);

}
