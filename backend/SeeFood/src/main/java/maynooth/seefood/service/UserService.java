package maynooth.seefood.service;

import maynooth.seefood.pojo.DTO.UserDTO;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;

import java.util.List;

public interface UserService {

    Result register(UserPO userPO);

    List<SeafoodPO> getLikes(long userId);

    UserPO selectUserByUserName(String username);

//    List<SeafoodPO> getPersonal(LoginUser loginUser);

    UserDTO getUserInfo(LoginUser loginUser);

    int putLike(LoginUser loginUser,int seafoodId);

    int deleteLike(LoginUser loginUser,int seafoodId);

}
