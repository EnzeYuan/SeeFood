package maynooth.seefood.service;

import maynooth.seefood.mapper.CartMapper;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.DTO.CartDTO;
import maynooth.seefood.pojo.PO.UserPO;
import maynooth.seefood.pojo.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PurchaseServiceImpl implements PurchaseService {
    
    @Autowired
    private SeafoodMapper seafoodMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private CartMapper cartMapper;


    @Override
    public List<CartDTO> selectNoPayedCart() {
        return cartMapper.selectNoPayedCart(getUserIdByContext());
    }

    @Override
    public List<CartDTO> selectPayedCart() {
        return cartMapper.selectPayedCartByUserId(getUserIdByContext());
    }

    @Override
    public int addToCart(int seafoodId) {
        long userId = getUserIdByContext();
        CartDTO cartDTO = cartMapper.selectWhetherBySeafoodId(seafoodId, userId);
        double price = seafoodMapper.getSeafoodById(seafoodId).getCost();
        if(cartDTO==null){
            CartDTO cartDTO1 = new CartDTO();
            cartDTO1.setSeafoodId(seafoodId);
            cartDTO1.setUserId(userId);
            cartDTO1.setPrice(price);
            return cartMapper.addToCart(cartDTO1);
        }else {
            cartMapper.updatePrice(cartDTO.getCartId(),price);
            return cartMapper.updateCart(seafoodId,userId);
        }
    }

    @Override
    public int reduceCart(int cartId) {
        long userId = getUserIdByContext();
        CartDTO cartDTO = cartMapper.selectCart(cartId);
        CartDTO i = cartMapper.selectWhetherBySeafoodId(cartDTO.getSeafoodId(), userId);
        if(i.getCount()==1){
            return cartMapper.deleteCart(cartId);
        }else {
            double price = seafoodMapper.getSeafoodById(cartDTO.getSeafoodId()).getCost();
            cartMapper.updatePrice(cartId,price);
            return cartMapper.reduceCart(cartId);
        }
    }

    @Override
    public int goToPay(List<Integer> cartIdIds) {
        double total = 0;
        for (Integer cartIdId : cartIdIds) {
            total +=cartMapper.selectCart(cartIdId).getPrice();
        }
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserPO userPO = userMapper.selectUserByUserName(user.getUsername());
        if(userPO.getMoney()<total){
            return 0;
        }else {
            //更新余额
            userMapper.updateMoney(user.getUsername(), userPO.getMoney()-total);
            //更新cart pay
            cartIdIds.forEach(cartId -> {cartMapper.updatePayed(cartId);});
            return 1;
        }
    }

    private long getUserIdByContext() {
        LoginUser user=(LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userMapper.selectUserByUserName(user.getUsername()).getUserId();
    }
}
