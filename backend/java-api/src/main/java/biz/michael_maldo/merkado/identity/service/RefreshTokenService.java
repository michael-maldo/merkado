package biz.michael_maldo.merkado.identity.service;

import biz.michael_maldo.merkado.identity.entity.RefreshToken;
import biz.michael_maldo.merkado.identity.entity.User;

import biz.michael_maldo.merkado.identity.exception.InvalidRefreshTokenException;
import biz.michael_maldo.merkado.identity.exception.RefreshTokenExpiredException;

import biz.michael_maldo.merkado.identity.repository.RefreshTokenRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository
            refreshTokenRepository;

    @Value("${jwt.refresh-token-expiration-days}")
    private Long refreshTokenDays;

    public RefreshToken create(
            User user
    ) {

        RefreshToken token =
                RefreshToken.builder()

                        .token(
                                UUID.randomUUID()
                                        .toString()
                        )

                        .user(user)

                        .revoked(false)

                        .createdAt(
                                LocalDateTime.now()
                        )

                        .expiresAt(
                                LocalDateTime.now()
                                        .plusDays(
                                                refreshTokenDays
                                        )
                        )

                        .build();

        return refreshTokenRepository
                .save(token);
    }

    public RefreshToken validate(
            String token
    ) {

        RefreshToken refreshToken =
                refreshTokenRepository
                        .findByToken(token)
                        .orElseThrow(
                                InvalidRefreshTokenException::new
                        );

        if (
                Boolean.TRUE.equals(
                        refreshToken.getRevoked()
                )
        ) {

            throw new InvalidRefreshTokenException();
        }

        if (
                refreshToken.getExpiresAt()
                        .isBefore(
                                LocalDateTime.now()
                        )
        ) {

            throw new RefreshTokenExpiredException();
        }

        return refreshToken;
    }

    public void revoke(
            String token
    ) {

        RefreshToken refreshToken =
                validate(token);

        refreshToken.setRevoked(true);

        refreshTokenRepository.save(
                refreshToken
        );
    }
}