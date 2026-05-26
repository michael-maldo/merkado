package biz.michael_maldo.merkado.identity.controller;

import biz.michael_maldo.merkado.identity.dto.LoginRequest;
import biz.michael_maldo.merkado.identity.dto.LoginResponse;

import biz.michael_maldo.merkado.identity.service.AuthService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(
            @RequestBody LoginRequest request
    ) {

        return authService.login(request);
    }
}