package biz.michael_maldo.merkado.identity.service;

import biz.michael_maldo.merkado.identity.dto.request.LoginRequest;
import biz.michael_maldo.merkado.identity.dto.request.RefreshTokenRequest;

import biz.michael_maldo.merkado.identity.dto.response.CurrentUserResponse;
import biz.michael_maldo.merkado.identity.dto.response.LoginResponse;
import biz.michael_maldo.merkado.identity.dto.response.RefreshTokenResponse;

import biz.michael_maldo.merkado.identity.entity.RefreshToken;
import biz.michael_maldo.merkado.identity.entity.User;

import biz.michael_maldo.merkado.identity.exception.InvalidCredentialsException;
import biz.michael_maldo.merkado.identity.exception.UserNotFoundException;

import biz.michael_maldo.merkado.identity.mapper.AuthMapper;

import biz.michael_maldo.merkado.identity.repository.UserRepository;

import biz.michael_maldo.merkado.identity.security.JwtService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    private final RefreshTokenService
            refreshTokenService;

    private final AuthMapper authMapper;

    @Value("${jwt.access-token-expiration-minutes}")
    private Long accessTokenMinutes;

    public LoginResponse login(
            LoginRequest request
    ) {

        User user =
                userRepository
                        .findByUsername(
                                request.username()
                        )
                        .orElseThrow(
                                InvalidCredentialsException::new
                        );

        boolean valid =
                passwordEncoder.matches(
                        request.password(),
                        user.getPassword()
                );

        if (!valid) {

            throw new InvalidCredentialsException();
        }

        String accessToken =
                jwtService.generateAccessToken(
                        user
                );

        RefreshToken refreshToken =
                refreshTokenService.create(
                        user
                );

        return new LoginResponse(
                accessToken,
                refreshToken.getToken(),
                accessTokenMinutes * 60
        );
    }

    public RefreshTokenResponse refresh(
            RefreshTokenRequest request
    ) {

        RefreshToken refreshToken =
                refreshTokenService.validate(
                        request.refreshToken()
                );

        User user =
                refreshToken.getUser();

        String accessToken =
                jwtService.generateAccessToken(
                        user
                );

        return new RefreshTokenResponse(
                accessToken,
                accessTokenMinutes * 60
        );
    }

    public CurrentUserResponse me(
            String username
    ) {

        User user =
                userRepository
                        .findByUsername(
                                username
                        )
                        .orElseThrow(
                                UserNotFoundException::new
                        );

        return authMapper
                .toCurrentUserResponse(
                        user
                );
    }

    public void logout(
            String refreshToken
    ) {

        refreshTokenService.revoke(
                refreshToken
        );
    }
}



//package biz.michael_maldo.merkado.identity.service;

//import biz.michael_maldo.merkado.identity.dto.request.LoginRequest;
//import biz.michael_maldo.merkado.identity.dto.response.LoginResponse;
//
//import biz.michael_maldo.merkado.identity.entity.User;
//
//import biz.michael_maldo.merkado.identity.repository.UserRepository;
//
//import biz.michael_maldo.merkado.shared.security.JwtService;
//
//import lombok.RequiredArgsConstructor;
//
//import org.springframework.security.crypto.password.PasswordEncoder;
//
//import org.springframework.stereotype.Service;
//
//@Service
//@RequiredArgsConstructor
//public class AuthService {
//
//    private final UserRepository userRepository;
//
//    private final PasswordEncoder passwordEncoder;
//
//    private final JwtService jwtService;
//
//    public LoginResponse login(LoginRequest request) {
//
//        User user = userRepository
//                .findByUsername(request.getUsername())
//                .orElseThrow(() ->
//                        new RuntimeException("Invalid credentials")
//                );
//
//        boolean matches = passwordEncoder.matches(
//                request.getPassword(),
//                user.getPassword()
//        );
//
//        if (!matches) {
//            throw new RuntimeException("Invalid credentials");
//        }
//
//        String token =
//                jwtService.generateToken(user.getUsername());
//
//        return new LoginResponse(token);
//    }
//}