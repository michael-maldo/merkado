package biz.michael_maldo.merkado.identity.dto;

import lombok.Data;

@Data
public class LoginRequest {

    private String username;
    private String password;
}
