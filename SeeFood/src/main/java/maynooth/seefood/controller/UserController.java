package maynooth.seefood.controller;

import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;
import maynooth.seefood.service.UserServiceImpl;
import maynooth.seefood.utils.SnowflakeIdWorker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/seefood/user")
public class UserController {

    BCryptPasswordEncoder bCryptPasswordEncoder =  new BCryptPasswordEncoder();

    @Autowired
    UserServiceImpl userService;

    @PostMapping("/register")
    public Result register(@RequestBody UserPO user) {
        user.setUserId(new SnowflakeIdWorker(5,2).nextId());
        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        return userService.register(user);
    }

    @GetMapping("/getLike")
    public Result getLike() {
        LoginUser principal = (LoginUser)SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = userService.selectUserByUserName(principal.getUsername()).getUserId();
        System.out.println(userId);
        List<SeafoodPO> likes = userService.getLikes(userId);
        return new Result(200,"Success",likes);
    }

    @GetMapping("/getPersonal")
    public Result getPersonal(){
        return new Result(200,"Success",userService.getPersonal());
    }


    //put like
    @PutMapping("/putlike/{seafoodId}")
    public Result putLike(@PathVariable("seafoodId")int seafoodId){
        return new Result(200,"Success",userService.putLike(seafoodId));
    }

    //cancel like
    @PutMapping("/deletelike/{seafoodId}")
    public Result deleteLike(@PathVariable("seafoodId")int seafoodId){
        return new Result(200,"Success",userService.deleteLike(seafoodId));
    }

    //get user info
    @GetMapping("/getuserinfo")
    public Result getUserInfo(){
        return new Result(200,"Success",userService.getUserInfo());
    }
}
