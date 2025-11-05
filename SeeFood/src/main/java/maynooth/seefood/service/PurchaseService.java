package maynooth.seefood.service;

import maynooth.seefood.pojo.DTO.CartDTO;

import java.util.List;

public interface PurchaseService {

    //get not pay cart
    List<CartDTO> selectNoPayedCart();

    //get payed
    List<CartDTO> selectPayedCart();

    //add to cart
    int addToCart(int seafoodId);

    //reduce cart
    int reduceCart(int cartId);

    //pay
    int goToPay(List<Integer> cartIdIds);
}
