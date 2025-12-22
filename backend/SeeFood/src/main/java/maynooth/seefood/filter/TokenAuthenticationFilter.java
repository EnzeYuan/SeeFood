package maynooth.seefood.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.UserPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

import java.util.Map;
@Slf4j
@Component
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // 1️⃣ 打印请求头
        String authHeader = request.getHeader("Authorization");
        log.info("=== TokenFilter Start ===");
        log.info("Authorization Header: {}", authHeader);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            log.info("Extracted token: {}", token);

            // 2️⃣ 打印 Redis key
            String redisKey = "user:token:" + token;
            log.info("Redis key: {}", redisKey);

            // 3️⃣ 打印 Redis 查询结果
            Map<Object, Object> userInfo = redisTemplate.opsForHash().entries(redisKey);
            log.info("Redis data: {}", userInfo);

            if (!userInfo.isEmpty()) {
                // 4️⃣ 打印解析过程
                Long userId = Long.parseLong((String) userInfo.get("userId"));
                String username = (String) userInfo.get("username");
                log.info("Parsed userId: {}, username: {}", userId, username);

                // 组装 LoginUser
                UserPO user = new UserPO();
                user.setUserId(userId);
                user.setUsername(username);

                LoginUser loginUser = new LoginUser(user);
                Authentication auth = new UsernamePasswordAuthenticationToken(
                        loginUser, null, loginUser.getAuthorities());

                // 5️⃣ 打印设置前的 SecurityContext
                log.info("Setting Authentication: {}", auth);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                log.warn("Redis data is EMPTY for key: {}", redisKey);
            }
        } else {
            log.warn("Authorization header is missing or invalid!");
        }

        log.info("=== TokenFilter End ===");
        chain.doFilter(request, response);
    }
}