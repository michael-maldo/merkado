package biz.michael_maldo.merkado.identity.security;

import biz.michael_maldo.merkado.identity.entity.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration-minutes}")
    private Long accessTokenExpirationMinutes;

    private SecretKey getSigningKey() {

        return Keys.hmacShaKeyFor(
                secret.getBytes(
                        StandardCharsets.UTF_8
                )
        );
    }

    public String generateAccessToken(
            User user
    ) {

        List<String> roles =
                user.getRoles()
                        .stream()
                        .map(role -> role.getName())
                        .toList();

        Date now = new Date();

        Date expiry = new Date(
                now.getTime()
                        + accessTokenExpirationMinutes
                        * 60
                        * 1000
        );

        return Jwts.builder()

                .subject(
                        user.getUsername()
                )

                .claim(
                        "userId",
                        user.getId()
                )

                .claim(
                        "roles",
                        roles
                )

                .issuedAt(now)

                .expiration(expiry)

                .signWith(
                        getSigningKey()
                )

                .compact();
    }

    public Claims extractClaims(
            String token
    ) {

        return Jwts.parser()
                .verifyWith(
                        getSigningKey()
                )
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(
            String token
    ) {

        return extractClaims(token)
                .getSubject();
    }

    public List<String> extractRoles(
            String token
    ) {

        return extractClaims(token)
                .get(
                        "roles",
                        List.class
                );
    }

    public Long extractUserId(
            String token
    ) {

        Number value =
                extractClaims(token)
                        .get(
                                "userId",
                                Number.class
                        );

        return value.longValue();
    }

    public boolean isValid(
            String token
    ) {

        try {

            extractClaims(token);

            return true;

        } catch (Exception ex) {

            return false;
        }
    }
}