package maynooth.seefood.mapper;


import maynooth.seefood.pojo.PO.RecipePO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface RecipeMapper {

    List<RecipePO> getRecipesBySeafoodId(int seafoodId);

    List<RecipePO> getRecipeBySeafoodId(int seafoodId);

    List<RecipePO> addRecipe(RecipePO recipePO);

    int addCooking(int seafoodId,int recipeId);
}
