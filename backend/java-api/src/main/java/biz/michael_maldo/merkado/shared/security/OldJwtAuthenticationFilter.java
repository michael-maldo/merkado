package biz.michael_maldo.merkado.shared.security;

import biz.michael_maldo.merkado.identity.security.JwtService;
import biz.michael_maldo.merkado.identity.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class OldJwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;

  private final CustomUserDetailsService userDetailsService;

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain
  ) throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");

    final String jwt;

    final String username;

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);

      return;
    }

    jwt = authHeader.substring(7);

    username = jwtService.extractUsername(jwt);

    if (
      username != null &&
      SecurityContextHolder.getContext().getAuthentication() == null
    ) {
      UserDetails userDetails = userDetailsService.loadUserByUsername(username);

      UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(
          userDetails,
          null,
          userDetails.getAuthorities()
        );

      authToken.setDetails(
        new WebAuthenticationDetailsSource().buildDetails(request)
      );

      SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    filterChain.doFilter(request, response);
  }
}
