package maynooth.seefood.pojo;

import lombok.Data;
import lombok.NoArgsConstructor;
import maynooth.seefood.pojo.PO.UserPO;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@NoArgsConstructor
public class LoginUser implements UserDetails {
    private UserPO user;
    public LoginUser(UserPO user) {
        this.user = user;
    }
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    public long getUserId(){
        return this.user.getUserId();
    }
}