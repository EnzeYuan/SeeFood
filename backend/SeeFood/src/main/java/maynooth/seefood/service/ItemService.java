package maynooth.seefood.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import maynooth.seefood.pojo.DTO.ItemDTO;


public interface ItemService {

   ItemDTO getDetail(int itemId);
}
