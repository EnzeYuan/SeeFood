package maynooth.seefood.service;


import maynooth.seefood.mapper.RecipeMapper;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.pojo.DTO.ItemDTO;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ItemServiceImpl implements ItemService {
    @Autowired
    private SeafoodMapper seafoodMapper;
    @Autowired
    private RecipeMapper recipeMapper;


    @Override
    public ItemDTO getDetail(int itemId) {
        //get seafood by seafoodId
        SeafoodPO seafood= seafoodMapper.getSeafoodById(itemId);
        //get recipe by seafoodId
        List<RecipePO> recipePOs = recipeMapper.getRecipeBySeafoodId(itemId);
        //create an itemDTO
        return new ItemDTO(itemId,recipePOs,seafood);
    }


}
