package maynooth.seefood.controller;


import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.ItemServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/seefood/item" )
public class ItemController {

    @Autowired
    ItemServiceImpl itemService;


    //see detail
    @GetMapping("/detail/{itemId}")
    public Result getDetail(@PathVariable("itemId") int itemId){
        return new Result(200,"success",itemService.getDetail(itemId));
    }

}
