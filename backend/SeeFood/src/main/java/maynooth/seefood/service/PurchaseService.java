package maynooth.seefood.service;

import maynooth.seefood.pojo.DTO.CartDTO;
import maynooth.seefood.pojo.DTO.ICartDTO;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.IngredientPO;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

public interface PurchaseService {

    //get not pay cart
    List<CartDTO> selectNoPayedCart(LoginUser loginUser);

    List<ICartDTO> selectNopayedICart(LoginUser loginUser);

    //get payed
    List<CartDTO> selectPayedCart(LoginUser loginUser);

    //add to cart
    int addToCart(LoginUser loginUser, int seafoodId);

    int updateCount(int cartId,int count);

    //pay
    int goToPayCart(LoginUser loginUser, List<Integer> cartIdIds);

    int goToPayICart(LoginUser loginUser,List<Integer> iCartIds);

    //食材加购物车

    int addIngredientToCart(LoginUser loginUser, IngredientPO ingredient);

    //更新石材数量

    int updateIngredientCart(int iCartId, int count);

    List<ICartDTO> selectPayedICart(LoginUser loginUser);
}
