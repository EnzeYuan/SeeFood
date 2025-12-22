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

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
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
        // 1. 认证
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
                user.getUsername(), user.getPassword());
        Authentication authentication = authenticationManager.authenticate(token);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 2. 获取用户信息
        UserPO loginUser = userMapper.selectUserByUserName(user.getUsername());

        if(loginUser == null){
            return new Result(500,"Fail","pwd is wrong");
        }
        Long userId = loginUser.getUserId();

        // 3. ✅ 生成token并存入Redis（key: user:token:xxx）
        String accessToken = UUID.randomUUID().toString().replace("-", "");
        String redisKey = "user:token:" + accessToken;

        // 存储用户基本信息（JSON格式）
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("userId", String.valueOf(userId));
        userInfo.put("username", loginUser.getUsername());
        stringRedisTemplate.opsForHash().putAll(redisKey, userInfo);
        stringRedisTemplate.expire(redisKey, 2, TimeUnit.HOURS); // 2小时过期

        // 4. 返回token给前端
        Map<String, Object> data = new HashMap<>();
        data.put("token", accessToken);
        data.put("userId", userId);
        data.put("username", loginUser.getUsername());

        return new Result(200, "Login Success", data);
    }
}
