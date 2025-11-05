package maynooth.seefood.service;


import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;

import java.util.List;

public interface AIService {

    //add seafood
    int addSeafood(SeafoodPO seafoodPO);

    //add recipe
    int addRecipe(List<RecipePO> recipePO);

}
