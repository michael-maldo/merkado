package biz.michael_maldo.merkado.identity.service;

import biz.michael_maldo.merkado.identity.dto.LoginRequest;
import biz.michael_maldo.merkado.identity.dto.LoginResponse;

import biz.michael_maldo.merkado.identity.entity.User;

import biz.michael_maldo.merkado.identity.repository.UserRepository;

import biz.michael_maldo.merkado.shared.security.JwtService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {

        User user = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() ->
                        new RuntimeException("Invalid credentials")
                );

        boolean matches = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!matches) {
            throw new RuntimeException("Invalid credentials");
        }

        String token =
                jwtService.generateToken(user.getUsername());

        return new LoginResponse(token);
    }
}