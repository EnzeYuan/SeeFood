package maynooth.seefood.mapper;

import maynooth.seefood.pojo.DTO.CartDTO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
@Repository
public interface CartMapper {
    //add to cart
    int addToCart(CartDTO  cartDTO);

//    //add cart
//    int updateCart(int seafoodId,long userId);
//
//    //reduction of cart
//    int reduceCart(int cartId);

    //delete cart
    int deleteCart(int cartId);

    //update price
    int updatePrice(int cartId,double price);

//    //reduce price
//    int reducePrice(int cartId,double price);

    //have added or not
    CartDTO selectWhetherBySeafoodId(int seafoodId,long userId);

    //get num of seafood
    int selectCount(int cartId);

    //selectCartById
    CartDTO selectCart(int cartId);

    //update payed
    int updatePayed(int cartId, LocalDateTime orderTime);

    //get not pay cart
    List<CartDTO> selectNoPayedCart(long userId);

    //get pay cart
    List<CartDTO> selectPayedCartByUserId(long userId);

    int updateCart(int cartId,int count);

//    //add cart
//    int addCart(int cartId);

}

