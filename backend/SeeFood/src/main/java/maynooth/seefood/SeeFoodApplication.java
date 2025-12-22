package maynooth.seefood;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class SeeFoodApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeeFoodApplication.class, args);
    }

}
