package maynooth.seefood.service;

import maynooth.seefood.mapper.RecipeMapper;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AIServiceImpl implements AIService{

    private int seafoodId;

    @Autowired
    SeafoodMapper seafoodMapper;
    @Autowired
    RecipeMapper recipeMapper;
    @Override
    public int addSeafood(SeafoodPO seafoodPO) {
        int i = seafoodMapper.addSeafood(seafoodPO);
        seafoodId = seafoodPO.getSeafoodId();
        return i;
    }

    @Override
    public int addRecipe(List<RecipePO> recipePOs) {
        recipePOs.forEach(recipePO -> {
            recipeMapper.addRecipe(recipePO);
            recipeMapper.addCooking(seafoodId,recipePO.getRecipeId());
        });
        return 1;
    }
}
