package maynooth.seefood.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.DTO.UserDTO;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.pojo.PO.UserPO;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

//    private static final Map<String, Integer> TAG_PRIORITY = Map.of(
//            "FISH", 0,
//            "CRUSTACEAN", 1,
//            "MOLLUSK", 2,
//            "SHELLFISH", 3
//    );

    private final UserMapper userMapper;
    private final SeafoodMapper seafoodMapper;

//    /**
//     * 根据用户ID获取用户标签（最喜欢的海鲜类别）
//     * 如果用户没有点赞记录，返回默认标签 "FISH"
//     */
//    public String getUserTag(Long userId) {
//        List<SeafoodPO> likes = getLikes(userId);
//
//        // 统计每个标签的点赞数
//        Map<String, Long> tagCount = likes.stream()
//                .collect(Collectors.groupingBy(SeafoodPO::getTags, Collectors.counting()));
//
//        // 找到点赞数最多的标签（并列时取第一个）
//        return tagCount.entrySet().stream()
//                .max(Map.Entry.comparingByValue())
//                .map(Map.Entry::getKey)
//                .orElse("FISH"); // ✅ 保底返回，避免 NPE
//    }

//    @Override
//    public List<SeafoodPO> getPersonal(@AuthenticationPrincipal LoginUser loginUser) {
//        // ✅ 直接从 LoginUser 拿 userId，不查库
//        Long userId = loginUser.getUserId();
//        String tag = getUserTag(userId);
//        return seafoodMapper.getSeafoodByTag(tag);
//    }

    @Override
    public UserDTO getUserInfo(@AuthenticationPrincipal LoginUser loginUser) {
        // ✅ 直接从 LoginUser 拿用户信息
        UserPO userPO = loginUser.getUser(); // LoginUser 里包着 UserPO
        return UserDTO.builder()
                .username(userPO.getUsername())
                .avatar(userPO.getAvatar())
                .brief(userPO.getBrief())
                .build();
    }

    @Override
    public int putLike(@AuthenticationPrincipal LoginUser loginUser, int seafoodId) {
        // ✅ 直接拿 userId，不重复查库
        long userId = loginUser.getUserId();
        return seafoodMapper.putLike(seafoodId, userId);
    }

    @Override
    public int deleteLike(@AuthenticationPrincipal LoginUser loginUser, int seafoodId) {
        // ✅ 直接拿 userId，不重复查库
        long userId = loginUser.getUserId();
        return seafoodMapper.deleteLike(seafoodId, userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class) // ✅ 添加事务
    public Result register(UserPO userPO) {
        return new Result(200, "注册失败，请稍后重试", userMapper.insert(userPO));
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