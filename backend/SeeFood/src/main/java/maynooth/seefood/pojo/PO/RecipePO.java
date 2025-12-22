package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class RecipePO {
    private Integer recipeId;
    private String recipeName;
    private String recipeBrief;
    private String recipeImage;
}
