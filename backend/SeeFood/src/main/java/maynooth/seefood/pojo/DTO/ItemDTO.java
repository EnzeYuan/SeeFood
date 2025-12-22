package maynooth.seefood.pojo.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ItemDTO {
    private int itemId;
    private List<RecipePO> recipePOs;
    private SeafoodPO seafoodPO;

    public ItemDTO(List<RecipePO> recipePOs, SeafoodPO seafoodPO) {
        this.recipePOs = recipePOs;
        this.seafoodPO = seafoodPO;
        this.itemId=seafoodPO.getSeafoodId();
    }

}
