package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class SeafoodPO {
    private int seafoodId;
    private String seafoodName;
    private String seafoodBrief;
    private byte[] seafoodImage;
    private int views;
    private int season;
    private String tags;
    private double cost;
}
