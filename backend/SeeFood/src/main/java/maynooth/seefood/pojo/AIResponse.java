package maynooth.seefood.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import maynooth.seefood.pojo.PO.IngredientPO;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class AIResponse {
    SeafoodPO seafoodPO;
    List<RecipePO> recipePOList;
    List<IngredientPO> ingredientPOList;
}
