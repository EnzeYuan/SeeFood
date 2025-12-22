package maynooth.seefood.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import maynooth.seefood.mapper.IngredientMapper;
import maynooth.seefood.pojo.DTO.CartDTO;
import maynooth.seefood.pojo.DTO.ICartDTO;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.IngredientPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.PurchaseServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/seefood/purchase")
public class PurchaseController {

    @Autowired
    PurchaseServiceImpl purchaseService;


    @GetMapping("/getcart")
    public Result getCart(@AuthenticationPrincipal LoginUser loginUser) throws JsonProcessingException {
        return new Result(200, "Success", purchaseService.selectNoPayedCart(loginUser));
    }

    @GetMapping("/getingredientcart")
    public Result getIngredientCart(@AuthenticationPrincipal LoginUser loginUser) {
        List<ICartDTO> iCartDTOS = purchaseService.selectNopayedICart(loginUser);
        iCartDTOS.forEach(iCartDTO -> {
            System.out.println("=============================");
            System.out.println(iCartDTO);
        });
        return new Result(200, "Success", iCartDTOS);
    }

    @PostMapping("/gotopaycart")
    public Result goToPayCart(@AuthenticationPrincipal LoginUser loginUser, @RequestBody List<Integer> cartIds) {
        return new Result(200, "Success", purchaseService.goToPayCart(loginUser, cartIds));
    }

    @PostMapping("/gotopayicart")
    public Result goToPayICart(@AuthenticationPrincipal LoginUser loginUser,  @RequestBody List<Integer> iCartIds) {
        return new Result(200, "Success", purchaseService.goToPayICart(loginUser,iCartIds));
    }


    @GetMapping("/getorder")
    public Result gatOrder(@AuthenticationPrincipal LoginUser loginUser) throws JsonProcessingException {
        return new Result(200, "Success", purchaseService.selectPayedCart(loginUser));
    }

    @GetMapping("/getingredientorder")
    public Result getIngredientOrder(@AuthenticationPrincipal LoginUser loginUser) {
        return new Result(200, "Success", purchaseService.selectPayedICart(loginUser));
    }

    @PostMapping("/add/{seafoodId}")
    public Result addToCart(@AuthenticationPrincipal LoginUser loginUser, @PathVariable("seafoodId") int seafoodId) {
        return new Result(200, "Success", purchaseService.addToCart(loginUser, seafoodId));
    }

    @PutMapping("/updatecart/{cartId}/{count}")
    public Result updateCart(@PathVariable int cartId, @PathVariable int count) {
        return new Result(200,"Success",purchaseService.updateCount(cartId,count));
    }

    @PutMapping("/update/{iCartId}/{count}")
    public Result updateICart(@PathVariable int iCartId,@PathVariable int count){
        return new Result(200,"Success",purchaseService.updateIngredientCart(iCartId,count));
    }

    @PostMapping("/addingredienttocart")
    public Result addIngredientCart(@AuthenticationPrincipal LoginUser loginUser,@RequestBody IngredientPO ingredient) {
        return  new Result(200,"Success",purchaseService.addIngredientToCart(loginUser,ingredient));
    }






}
