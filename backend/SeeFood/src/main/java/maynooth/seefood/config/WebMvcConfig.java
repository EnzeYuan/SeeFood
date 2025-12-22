// maynooth/seefood/config/WebMvcConfig.java
package maynooth.seefood.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")  // Spring 5.3+
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(false)  // 设为false避免与*冲突
                .maxAge(3600);
    }
}