package maynooth.seefood.pojo.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
