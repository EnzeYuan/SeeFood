package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Component
@Builder
public class UserPO {
    private Long userId;
    private String username;
    private String password;
    private String brief;
    private byte[] avatar;
    private double money;
}
