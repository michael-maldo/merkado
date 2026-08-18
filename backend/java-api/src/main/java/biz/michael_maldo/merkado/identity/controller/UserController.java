package biz.michael_maldo.merkado.identity.controller;

import biz.michael_maldo.merkado.identity.entity.Role;
import biz.michael_maldo.merkado.identity.entity.User;
import biz.michael_maldo.merkado.identity.repository.RoleRepository;
import biz.michael_maldo.merkado.identity.repository.UserRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGEMENT')")
public class UserController {

  private final UserRepository users;
  private final RoleRepository roles;
  private final PasswordEncoder passwords;

  public record Create(
    @NotBlank String username,
    @Size(min = 8) String password,
    List<Long> roleIds
  ) {}

  public record Update(
    String username,
    @Size(min = 8) String password,
    Boolean enabled
  ) {}

  public record RoleAssignment(@NotNull Long roleId) {}

  public record View(
    Long id,
    String username,
    boolean enabled,
    List<Map<String, Object>> roles,
    LocalDateTime createdAt
  ) {
    static View from(User user) {
      return new View(
        user.getId(),
        user.getUsername(),
        Boolean.TRUE.equals(user.getEnabled()),
        user
          .getRoles()
          .stream()
          .map(r ->
            Map.<String, Object>of("id", r.getId(), "name", r.getName())
          )
          .toList(),
        user.getCreatedAt()
      );
    }
  }

  @GetMapping
  @Transactional(readOnly = true)
  public List<View> list() {
    return users.findAll().stream().map(View::from).toList();
  }

  @GetMapping("/{id}")
  @Transactional(readOnly = true)
  public View get(@PathVariable Long id) {
    return View.from(user(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public View create(@Valid @RequestBody Create request) {
    users.findByUsername(request.username().trim()).ifPresent(u -> {
      throw new BusinessException("Username already exists");
    });
    User user = new User();
    user.setUsername(request.username().trim());
    user.setPassword(passwords.encode(request.password()));
    user.setEnabled(true);
    user.setCreatedAt(LocalDateTime.now());
    if (request.roleIds() != null) request
      .roleIds()
      .forEach(id -> user.getRoles().add(role(id)));
    return View.from(users.save(user));
  }

  @PatchMapping("/{id}")
  @Transactional
  public View update(
    @PathVariable Long id,
    @Valid @RequestBody Update request
  ) {
    User user = user(id);
    if (
      request.username() != null && !request.username().isBlank()
    ) user.setUsername(request.username().trim());
    if (request.password() != null) user.setPassword(
      passwords.encode(request.password())
    );
    if (request.enabled() != null) user.setEnabled(request.enabled());
    return View.from(user);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void disable(@PathVariable Long id) {
    user(id).setEnabled(false);
  }

  @PostMapping("/{id}/roles")
  @Transactional
  public View assignRole(
    @PathVariable Long id,
    @Valid @RequestBody RoleAssignment request
  ) {
    User user = user(id);
    user.getRoles().add(role(request.roleId()));
    return View.from(user);
  }

  @DeleteMapping("/{id}/roles/{roleId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void removeRole(@PathVariable Long id, @PathVariable Long roleId) {
    User user = user(id);
    if (
      !user.getRoles().removeIf(r -> r.getId().equals(roleId))
    ) throw new BusinessException("Role is not assigned to user");
  }

  private User user(Long id) {
    return users
      .findById(id)
      .orElseThrow(() -> new BusinessException("User not found"));
  }

  private Role role(Long id) {
    return roles
      .findById(id)
      .orElseThrow(() -> new BusinessException("Role not found"));
  }
}
