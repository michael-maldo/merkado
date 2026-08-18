package biz.michael_maldo.merkado.identity.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(@NotBlank String refreshToken) {}
