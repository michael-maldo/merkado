package biz.michael_maldo.merkado.identity.controller;

import biz.michael_maldo.merkado.identity.dto.request.LoginRequest;
import biz.michael_maldo.merkado.identity.dto.request.LogoutRequest;
import biz.michael_maldo.merkado.identity.dto.request.RefreshTokenRequest;
import biz.michael_maldo.merkado.identity.dto.response.CurrentUserResponse;
import biz.michael_maldo.merkado.identity.dto.response.LoginResponse;
import biz.michael_maldo.merkado.identity.dto.response.RefreshTokenResponse;
import biz.michael_maldo.merkado.identity.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(
    @Valid @RequestBody LoginRequest request
  ) {
    return ResponseEntity.ok(authService.login(request));
  }

  @PostMapping("/refresh")
  public ResponseEntity<RefreshTokenResponse> refresh(
    @Valid @RequestBody RefreshTokenRequest request
  ) {
    return ResponseEntity.ok(authService.refresh(request));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
    @Valid @RequestBody LogoutRequest request
  ) {
    authService.logout(request.refreshToken());

    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public ResponseEntity<CurrentUserResponse> me(Authentication authentication) {
    return ResponseEntity.ok(authService.me(authentication.getName()));
  }
}
//package biz.michael_maldo.merkado.identity.controller;

//import biz.michael_maldo.merkado.identity.dto.request.LoginRequest;
//import biz.michael_maldo.merkado.identity.dto.response.LoginResponse;
//
//import biz.michael_maldo.merkado.identity.service.AuthService;

//import lombok.RequiredArgsConstructor;

//import org.springframework.web.bind.annotation.*;

//@RestController
//@RequestMapping("/api/v1/auth")
//@RequiredArgsConstructor
//public class AuthController {

//    private final AuthService authService;
//
//    @PostMapping("/login")
//    public LoginResponse login(
//            @RequestBody LoginRequest request
//    ) {
//
//        return authService.login(request);
//    }
//}
