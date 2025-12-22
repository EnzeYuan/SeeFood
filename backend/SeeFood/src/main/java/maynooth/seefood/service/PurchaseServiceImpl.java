package maynooth.seefood.service;

import lombok.extern.slf4j.Slf4j;
import maynooth.seefood.mapper.CartMapper;
import maynooth.seefood.mapper.IngredientMapper;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.mapper.UserMapper;
import maynooth.seefood.pojo.DTO.CartDTO;
import maynooth.seefood.pojo.DTO.ICartDTO;
import maynooth.seefood.pojo.PO.ICartPO;
import maynooth.seefood.pojo.PO.IngredientPO;
import maynooth.seefood.pojo.PO.UserPO;
import maynooth.seefood.pojo.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class PurchaseServiceImpl implements PurchaseService {

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private CartMapper cartMapper;
    @Autowired
    private IngredientMapper ingredientMapper;
    @Autowired
    private SeafoodMapper seafoodMapper;

    @Override
    public List<CartDTO> selectNoPayedCart(LoginUser loginUser) {
        return cartMapper.selectNoPayedCart(loginUser.getUserId());
    }

    @Override
    public List<ICartDTO> selectNopayedICart(LoginUser loginUser) {
        List<ICartDTO> iCartDTOList = new ArrayList<>();
        List<ICartPO> iCartPOs = ingredientMapper.selectNoPayedIngredients(loginUser.getUserId());
        iCartPOs.forEach(iCartPO -> {
            ICartDTO iCartDTO = new ICartDTO();
            iCartDTO.setICartId(iCartPO.getICartId());
//            int ingredientId = ingredientMapper.selectIngredientByCartId(iCartPO.getICartId());
            int ingredientId = iCartPO.getIngredientId();
            double ingredientPrice = ingredientMapper.selectIngredientById(ingredientId).getIngredientPrice();
            iCartDTO.setIngredient(ingredientMapper.selectIngredientById(iCartPO.getIngredientId()));
            iCartDTO.setPrice(ingredientPrice);
            iCartDTO.setCount(iCartPO.getCount());
            iCartDTO.setOrderTime(iCartPO.getOrderTime());
            iCartDTOList.add(iCartDTO);
            System.out.println(iCartDTO);
        });
        return iCartDTOList;
    }


    @Override
    public List<CartDTO> selectPayedCart(LoginUser loginUser) {
        return cartMapper.selectPayedCartByUserId(loginUser.getUserId());
    }

    //海鲜加购物车
    @Transactional
    @Override
    public int addToCart(LoginUser loginUser, int seafoodId) {
        long userId = loginUser.getUserId();
        CartDTO cartDTO = cartMapper.selectWhetherBySeafoodId(seafoodId, userId);
        double price = seafoodMapper.getSeafoodById(seafoodId).getCost();

        if (cartDTO == null) {
            CartDTO cartDTO1 = new CartDTO();
            cartDTO1.setSeafoodId(seafoodId);
            cartDTO1.setUserId(userId);
            cartDTO1.setPrice(price);
            System.out.println(cartDTO1);
            return cartMapper.addToCart(cartDTO1);
        } else {
            return cartMapper.updateCart(cartDTO.getCartId(), 1);
        }
    }

    //更新海鲜数量
    @Transactional
    @Override
    public int updateCount(int cartId, int count) {
        if (count == 0) {
            return cartMapper.deleteCart(cartId);
        }
        return cartMapper.updateCart(cartId, count);
    }

    @Override
    @Transactional
    public int goToPayCart(LoginUser loginUser, List<Integer> cartIdIds) {
        double total1 = 0;
        double total2 = 0;
        for (Integer cartIdId : cartIdIds) {
            total1 = cartMapper.selectCart(cartIdId).getCount() * cartMapper.selectCart(cartIdId).getPrice();
            total2+=total1;
            cartMapper.updatePrice(cartIdId, total1);
        }
        UserPO userPO = userMapper.selectUserByUserName(loginUser.getUsername());
        if (userPO.getMoney() < total2) {
            return 0;
        } else {
            //check balance
            userMapper.updateMoney(loginUser.getUsername(), userPO.getMoney() - total1 );
            //update cart pay
            cartIdIds.forEach(cartId -> {
                cartMapper.updatePayed(cartId, LocalDateTime.now());
            });
            return 1;
        }
    }

    @Override
    @Transactional
    public int goToPayICart(LoginUser loginUser, List<Integer> iCartIds) {
        double total2 = 0;
        double total3 = 0;
        for (Integer iCartId : iCartIds) {
            System.out.println("iCartId : "+iCartId);
            IngredientPO ingredientPO = ingredientMapper.selectIngredientByICartId(iCartId);
            System.out.println("IngredientPO: "+ingredientPO);
            Integer count = ingredientMapper.selectIngredientCountFromCart(iCartId);
            System.out.println("Count "+count);
            double price = ingredientPO.getIngredientPrice();
            total2 =  count *price;
            total3 +=total2;
            ingredientMapper.updatePrice(iCartId, total2);
        }
        UserPO userPO = userMapper.selectUserByUserName(loginUser.getUsername());
        if (userPO.getMoney() < total3) {
            return 0;
        } else {
            double money=userPO.getMoney() - total2;
            //check balance
            userMapper.updateMoney(loginUser.getUsername(), money );
            iCartIds.forEach(iCartId -> {
                ingredientMapper.updatePayed(iCartId, LocalDateTime.now());
            });
            return 1;
        }

    }

    // 在类中添加日志记录器


    @Transactional
    @Override
    public int addIngredientToCart(LoginUser loginUser, IngredientPO ingredient) {

        log.info("========== addIngredientToCart 方法开始执行 ==========");
        log.info("用户ID: {}", loginUser.getUserId());
        log.info("食材名称: {}", ingredient.getIngredientName());

        AtomicInteger a = new AtomicInteger();
        long userId = loginUser.getUserId();
        log.debug("提取用户ID: {}", userId);

        // 检查食材表中的重复性
        log.info("步骤1: 查询食材表中是否已存在同名食材");
        Integer ingredientId = ingredientMapper.selectIngredientByIngredientName(ingredient.getIngredientName());
        log.info("查询结果: 找到 {} 个同名食材", ingredientId);

        if (ingredientId == null) {
            log.info("分支1: 食材不存在，开始添加新食材");

            // 添加新食材到 ingredient 表
            log.debug("执行 addIngredient，参数: {}", ingredient);
            ingredientMapper.addIngredient(ingredient);
            log.info("食材添加成功，生成 ingredientId: {}", ingredient.getIngredientId());

            // 将新食材添加到购物车
            log.info("步骤2: 将新食材添加到用户购物车");
            log.debug("执行 addIngredientToCart，ingredientId: {}, userId: {}", ingredient.getIngredientId(), userId);
            int i = ingredientMapper.addIngredientToCart(ingredient.getIngredientId(), userId);
            log.info("购物车ID为:{}",i);
            log.info("食材成功加入购物车");

        } else {
            log.info("分支2: 食材已存在，跳过添加食材表");

            // 检查购物车中是否已存在该食材
            log.info("步骤2: 查询购物车中是否已存在该食材");
            Integer iCartId = ingredientMapper.selectIngredientCartIdFromCart(ingredient.getIngredientName(), userId);
            log.info("查询结果: iCartId = {}", iCartId);

            if (iCartId == null) {
                log.info("子分支2.1: 购物车中不存在，添加新条目");
                Integer i  = ingredientMapper.selectIngredientByIngredientName(ingredient.getIngredientName());
                // 需要先获取已存在的食材ID
                log.debug("查询已存在食材的ID，食材名: {}", ingredient.getIngredientName());
                // 注意：这里需要确保 ingredient.getIngredientId() 有值
                // 如果前端没传，需要从数据库查询


                int j = ingredientMapper.addIngredientToCart(i, userId);
                log.info("购物车ID为:{}",j);
                log.info("食材成功加入购物车");

            } else {
                log.info("子分支2.2: 购物车中已存在，更新数量");
                log.debug("执行 updateCount，iCartId: {}, 增加数量: {}", iCartId, 1);
                ingredientMapper.updateCount(iCartId, 1);
                log.info("购物车数量更新成功");
            }
        }
        a.getAndIncrement();
        log.info("方法执行完成，返回值: {}", a.get());
        log.info("========== addIngredientToCart 方法结束 ==========");
        return a.get();
    }

    //更新食材数量
    @Transactional
    @Override
    public int updateIngredientCart(int iCartId, int count) {
        if (count == 0) {
            return ingredientMapper.deleteIngredientCart(iCartId);
        }
        return ingredientMapper.updateCount(iCartId, count);
    }

    @Override
    public List<ICartDTO> selectPayedICart(LoginUser loginUser) {
        List<ICartDTO> iCartDTOList = new ArrayList<>();
        List<ICartPO> iCartPOs = ingredientMapper.selectPayedIngredients(loginUser.getUserId());
        iCartPOs.forEach(iCartPO -> {
            ICartDTO iCartDTO = new ICartDTO();
            iCartDTO.setICartId(iCartPO.getICartId());
            iCartDTO.setIngredient(ingredientMapper.selectIngredientById(iCartPO.getIngredientId()));
            iCartDTO.setPrice(iCartPO.getPrice());
            iCartDTO.setCount(iCartPO.getCount());
            iCartDTO.setOrderTime(iCartPO.getOrderTime());
            iCartDTOList.add(iCartDTO);
        });
        return iCartDTOList;
    }


}
