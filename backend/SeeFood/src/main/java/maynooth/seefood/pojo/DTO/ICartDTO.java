package maynooth.seefood.pojo.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import maynooth.seefood.pojo.PO.IngredientPO;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ICartDTO {
    private int iCartId;
    private IngredientPO ingredient;
    private int count;
    private double price;
    private LocalDateTime orderTime;
}
