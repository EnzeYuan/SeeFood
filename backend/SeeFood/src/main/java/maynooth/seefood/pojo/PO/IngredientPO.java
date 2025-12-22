package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class IngredientPO {
    private Integer ingredientId;
    private String ingredientName;
    private double ingredientPrice;
    private String ingredientPic;
}
