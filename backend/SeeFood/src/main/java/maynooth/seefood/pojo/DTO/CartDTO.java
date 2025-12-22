package maynooth.seefood.pojo.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CartDTO {
    private int cartId;
    private long userId;
    private int seafoodId;
    private int count;
    private boolean payed;
    private double price;
    private LocalDateTime orderTime;
}
