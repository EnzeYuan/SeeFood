package maynooth.seefood.controller;

import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.PurchaseServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/seefood/cart")
public class PurchaseController {

    @Autowired
    PurchaseServiceImpl purchaseService;

    @GetMapping("/getcart")
    public Result getCart() {
        return new Result(200,"Success",purchaseService.selectNoPayedCart());
    }

    @PostMapping("/gotopay")
    public Result goToPay(@RequestBody List<Integer> cartIds) {
        return new Result(200,"Success",purchaseService.goToPay(cartIds));
    }

    @GetMapping("/getorder")
    public Result gatOrder(){
        return new Result(200,"Success",purchaseService.selectPayedCart());
    }

    @PutMapping("/add/{seafoodId}")
    public Result addToCart(@PathVariable("seafoodId") int seafoodId) {
        return new Result(200,"Success",purchaseService.addToCart(seafoodId)) ;
    }

    @PutMapping("/reduce/{cartId}")
    public Result reduceCart(@PathVariable("cartId") int cartId){
        return new Result(200,"Success",purchaseService.reduceCart(cartId));
    }


}
