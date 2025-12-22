package maynooth.seefood.mapper;

import maynooth.seefood.pojo.PO.ICartPO;
import maynooth.seefood.pojo.PO.IngredientPO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
@Repository
public interface IngredientMapper {

    int addIngredientToCart(int ingredientId, long userId);

    int addIngredient(IngredientPO ingredientPO);

    Integer selectIngredientByIngredientName(String ingredientName);

    Integer selectIngredientCountFromCart(int iCartId);

    Integer selectIngredientCartIdFromCart(String ingredientName, long userId);

    int updateCount(int iCartId, int count);

    IngredientPO selectIngredientByICartId(int iCartId);

    int updatePayed(int iCartId, LocalDateTime orderTime);

    void updatePrice(int iCartId, double total2);

    List<ICartPO> selectNoPayedIngredients(long userId);

    IngredientPO selectIngredientById(int ingredientId);

    List<ICartPO> selectPayedIngredients(long userId);

    int deleteIngredientCart(int iCartId);

    int selectIngredientByCartId(int iCartId);
}
