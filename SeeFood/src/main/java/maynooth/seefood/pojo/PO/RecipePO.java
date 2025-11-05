package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecipePO {
    private int recipeId;
    private String recipeName;
    private String recipeBrief;
    private byte[] recipeImage;
}
