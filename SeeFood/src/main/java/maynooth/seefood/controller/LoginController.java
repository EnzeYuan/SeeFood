package maynooth.seefood.controller;


import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;


/**
 * @author 袁同学
 */
@RestController
public class LoginController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    UserMapper userMapper;
    @Autowired
    StringRedisTemplate stringRedisTemplate;

    @PostMapping("/seefood/user/login")
    public Result login(@RequestBody UserPO user){

        // 使用用户名和密码进行认证(已经配置过加密器了，所以不用手动调用加密)
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
                user.getUsername(), user.getPassword());
        //验证
        Authentication authentication = authenticationManager.authenticate(token);
        SecurityContextHolder.getContext().setAuthentication(authentication);


        //用户id和用户名存入redis
        Long userId = userMapper.selectUserByUserName(user.getUsername()).getUserId();
        stringRedisTemplate.opsForHash().put("userLogin:"+user.getUsername(),"userId",String.valueOf(userId));
        stringRedisTemplate.expire("userLogin:"+userId, 300, TimeUnit.SECONDS);

        Result result = new Result();
        result.setData(("Login Success"));
        return result;
    }
}
