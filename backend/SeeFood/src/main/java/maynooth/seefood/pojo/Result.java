package maynooth.seefood.pojo;

import lombok.Data;

@Data
public class Result {
    private int code;
    private String message;
    private Object data;
    public Result() {}

    public Result(int code, String message, Object data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}
