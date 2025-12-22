package maynooth.seefood.controller;

import lombok.extern.slf4j.Slf4j;
import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;
import maynooth.seefood.service.UserServiceImpl;
import maynooth.seefood.utils.SnowflakeIdWorker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/seefood/user")

@Slf4j
public class UserController {

    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UserServiceImpl userService;
    @Autowired
    private UserMapper userMapper;
    SnowflakeIdWorker idWorker = new SnowflakeIdWorker(0, 0);

    @Autowired
    private StringRedisTemplate redisTemplate ;

    @PostMapping("/register")
    public Result register(@RequestBody @Validated UserPO user, BindingResult bindingResult) {
        // 1. 参数校验
        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getFieldErrors().stream()
                    .map(e -> e.getField() + ": " + e.getDefaultMessage())
                    .collect(Collectors.joining(", "));
            return new Result(400, "<UNK>", errorMsg);
        }


        // 3. 检查用户名重复
        UserPO flag = userMapper.selectUserByUserName(user.getUsername());
        if (flag != null) {
            return new Result(400, "it has already exist", user.getUsername());
        }

            // 4. 构造新用户
            UserPO newUser = new UserPO();

            newUser.setUserId(idWorker.nextId());
            newUser.setUsername(user.getUsername().trim());
            newUser.setPassword(passwordEncoder.encode(user.getPassword()));

            // 5. 保存到数据库
            userService.register(newUser);
            log.info("用户注册成功: {}", newUser.getUsername());

            // 6. ✅ 生成 token 并存入 Redis
            String accessToken = UUID.randomUUID().toString().replace("-", "");
            String redisKey = "user:token:" + accessToken;

            Map<String, String> userInfo = new HashMap<>();
            userInfo.put("userId", String.valueOf(newUser.getUserId()));
            userInfo.put("username", newUser.getUsername());
            // 如果有权限信息，也一并存入
            // userInfo.put("authorities", JSON.toJSONString(authorityList));

            redisTemplate.opsForHash().putAll(redisKey, userInfo);
            redisTemplate.expire(redisKey, 2, TimeUnit.HOURS);

            // 7. ✅ 返回 token 和用户信息
            Map<String, Object> data = new HashMap<>();
            data.put("token", accessToken);
            data.put("userId", newUser.getUserId());
            data.put("username", newUser.getUsername());

            return new Result(200, "注册成功",data);


    }

    @GetMapping("/getLike")
    public Result getLike(@AuthenticationPrincipal LoginUser loginUser) {
        // loginUser 现在一定不为 null（因为过滤器已经保证）
        long userId = loginUser.getUserId();
        // 直接拿 ID
        List<SeafoodPO> likes = userService.getLikes(userId);
        return new Result(200, "Success", likes);
    }

    @PutMapping("/putlike/{seafoodId}")
    public Result putLike(@AuthenticationPrincipal LoginUser loginUser,@PathVariable("seafoodId") int seafoodId) {
        return new Result(200, "Success", userService.putLike(loginUser,seafoodId));
    }

    @PutMapping("/deletelike/{seafoodId}")
    public Result deleteLike(@AuthenticationPrincipal LoginUser loginUser,@PathVariable("seafoodId") int seafoodId) {
        return new Result(200, "Success", userService.deleteLike(loginUser,seafoodId));
    }

    @GetMapping("/getuserinfo")
    public Result getUserInfo(@AuthenticationPrincipal LoginUser loginUser) {
        return new Result(200, "Success", userService.getUserInfo(loginUser));
    }
}