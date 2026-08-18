package biz.michael_maldo.merkado.identity.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank String refreshToken) {}
