package maynooth.seefood.pojo.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ICartPO {
    private int iCartId;
    private int ingredientId;
    private long userId;
    private double price;
    private boolean payed;
    private int count;
    private LocalDateTime orderTime;
}
