package maynooth.seefood.service;

import maynooth.seefood.controller.UserController;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.DTO.UserDTO;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {


    private static final int FISH=0;
    private static final int CRUSTACEAN = 1;
    private static final int MOLLUSK = 2;
    private static final int SHELLFISH = 3;
    @Autowired
    UserMapper userMapper;
    @Autowired
    SeafoodMapper seafoodMapper;



    public String getUserTag(Long userId){
        int[] arr = new int[4];
        //根据LIKE表统计 不同tag的数量
        List<SeafoodPO> likes = getLikes(userId);
        //1.查询对应海鲜的tag
        for(SeafoodPO seafoodPO:likes){
            switch (seafoodPO.getTags()){
                case "FISH":
                    arr[0]++;
                    break;
                case "CRUSTACEAN":
                    arr[1]++;
                    break;
                case "MOLLUSK":
                    arr[2]++;
                    break;
                case "SHELLFISH":
                    arr[3]++;
                    break;
            }
        }
        //2.数组统计
        int target = 0;
        int max = 0;
        for(int i=0;i<arr.length;i++){
            if(arr[i]>max){
                max = arr[i];
                target = i;
            }
        }

        return switch (target) {
            case FISH -> "FISH";
            case CRUSTACEAN -> "CRUSTACEAN";
            case MOLLUSK -> "MOLLUSK";
            case SHELLFISH -> "SHELLFISH";
            default -> null;
        };
    }


    @Override
    public List<SeafoodPO> getPersonal(){
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return seafoodMapper.getSeafoodByTag(getUserTag(userMapper.selectUserByUserName(user.getUsername()).getUserId()));
    }

    @Override
    public UserDTO getUserInfo() {
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserPO userPO = userMapper.selectUserByUserName(user.getUsername());
        UserDTO userDTO = new UserDTO();
        userDTO.setUsername(userPO.getUsername());
        userDTO.setAvatar(userPO.getAvatar());
        userDTO.setBrief(userPO.getBrief());
        return userDTO;
    }

    @Override
    public int putLike(int seafoodId) {
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return seafoodMapper.putLike(seafoodId, userMapper.selectUserByUserName(user.getUsername()).getUserId());
    }

    @Override
    public int deleteLike(int seafoodId) {
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return seafoodMapper.deleteLike(seafoodId, userMapper.selectUserByUserName(user.getUsername()).getUserId());
    }

    @Override
    public Result register(UserPO userPO) {
        int insert = userMapper.insert(userPO);
        return new Result(200,"Successful",insert);
    }

    @Override
    public List<SeafoodPO> getLikes(long userId) {
        return userMapper.getLike(userId);
    }

    @Override
    public UserPO selectUserByUserName(String username) {
        return userMapper.selectUserByUserName(username);
    }


}
