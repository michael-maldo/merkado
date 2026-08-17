package biz.michael_maldo.merkado.identity.dto.response;

public record LoginResponse(

        String accessToken,

        String refreshToken,

        Long expiresIn

) {
}