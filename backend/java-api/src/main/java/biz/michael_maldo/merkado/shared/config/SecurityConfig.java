//package biz.michael_maldo.merkado.shared.config;
// PROD ENV !!!
//
//import biz.michael_maldo.merkado.identity.security.JwtAuthenticationFilter;
//import lombok.RequiredArgsConstructor;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
//import org.springframework.security.config.http.SessionCreationPolicy;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.crypto.password.PasswordEncoder;
//import org.springframework.security.web.SecurityFilterChain;
//import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
//
//@Configuration
//@EnableWebSecurity
//@RequiredArgsConstructor
//public class SecurityConfig {
//
//    private final JwtAuthenticationFilter
//            jwtAuthenticationFilter;
//
//    @Bean
//    public PasswordEncoder passwordEncoder() {
//
//        return new BCryptPasswordEncoder();
//    }
//
//    @Bean
//    public SecurityFilterChain securityFilterChain(
//            HttpSecurity http
//    ) throws Exception {
//
//        http
//
//                .csrf(csrf ->
//                        csrf.disable()
//                )
//
//                .sessionManagement(session ->
//                        session.sessionCreationPolicy(
//                                SessionCreationPolicy.STATELESS
//                        )
//                )
//
//                .authorizeHttpRequests(auth ->
//                        auth
//
//                                .requestMatchers(
//                                        "/api/v1/auth/login",
//                                        "/api/v1/auth/refresh"
//                                )
//                                .permitAll()
//
//                                .anyRequest()
//                                .authenticated()
//                )
//
//                .addFilterBefore(
//                        jwtAuthenticationFilter,
//                        UsernamePasswordAuthenticationFilter.class
//                );
//
//        return http.build();
//    }
//}

// +++++++++++++++++++++++++++

package biz.michael_maldo.merkado.shared.config;

// DEV ENV!!!

import biz.michael_maldo.merkado.identity.security.JwtAuthenticationFilter;
import biz.michael_maldo.merkado.identity.service.CustomUserDetailsService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthFilter;

  private final CustomUserDetailsService userDetailsService;

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(
    AuthenticationConfiguration config
  ) throws Exception {
    return config.getAuthenticationManager();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    configuration.setAllowedOrigins(
      List.of("http://localhost:5173", "https://merkado.tech-labs.dev")
    );

    configuration.setAllowedMethods(
      List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
    );

    configuration.setAllowedHeaders(List.of("*"));

    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source =
      new UrlBasedCorsConfigurationSource();

    source.registerCorsConfiguration("/**", configuration);

    return source;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http)
    throws Exception {
    http
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))

      .csrf(csrf -> csrf.disable())

      .sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )

      .exceptionHandling(exceptions ->
        exceptions.authenticationEntryPoint(
          new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)
        )
      )

      .authorizeHttpRequests(auth ->
        auth
          .requestMatchers(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/health",
            "/api/v1/version"
          )
          .permitAll()

          .anyRequest()
          .authenticated()
      )

      .userDetailsService(userDetailsService)

      .addFilterBefore(
        jwtAuthFilter,
        UsernamePasswordAuthenticationFilter.class
      );

    return http.build();
  }
}
