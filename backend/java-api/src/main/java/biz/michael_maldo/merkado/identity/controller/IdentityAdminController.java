package biz.michael_maldo.merkado.identity.controller;

import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGEMENT')")
public class IdentityAdminController {

  private final JdbcClient db;

  public record Named(@NotBlank String name, String description) {}

  @GetMapping("/roles")
  public List<Map<String, Object>> roles() {
    return list("identity.roles");
  }

  @GetMapping("/roles/{id}")
  public Map<String, Object> role(@PathVariable long id) {
    return one("identity.roles", id);
  }

  @PostMapping("/roles")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> createRole(@Valid @RequestBody Named r) {
    long id = db
      .sql(
        "insert into identity.roles(name,description) values (:n,:d) returning id"
      )
      .param("n", r.name().trim())
      .param("d", r.description())
      .query(Long.class)
      .single();
    return role(id);
  }

  @PatchMapping("/roles/{id}")
  @Transactional
  public Map<String, Object> updateRole(
    @PathVariable long id,
    @Valid @RequestBody Named r
  ) {
    changed(
      db
        .sql("update identity.roles set name=:n,description=:d where id=:id")
        .param("n", r.name().trim())
        .param("d", r.description())
        .param("id", id)
        .update(),
      "Role"
    );
    return role(id);
  }

  @DeleteMapping("/roles/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void deleteRole(@PathVariable long id) {
    changed(
      db
        .sql("delete from identity.roles where id=:id")
        .param("id", id)
        .update(),
      "Role"
    );
  }

  @GetMapping("/permissions")
  public List<Map<String, Object>> permissions() {
    return list("identity.permissions");
  }

  @PostMapping("/permissions")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> createPermission(@Valid @RequestBody Named r) {
    long id = db
      .sql(
        "insert into identity.permissions(name,description) values (:n,:d) returning id"
      )
      .param("n", r.name().trim())
      .param("d", r.description())
      .query(Long.class)
      .single();
    return one("identity.permissions", id);
  }

  @PatchMapping("/permissions/{id}")
  @Transactional
  public Map<String, Object> updatePermission(
    @PathVariable long id,
    @Valid @RequestBody Named r
  ) {
    changed(
      db
        .sql(
          "update identity.permissions set name=:n,description=:d where id=:id"
        )
        .param("n", r.name().trim())
        .param("d", r.description())
        .param("id", id)
        .update(),
      "Permission"
    );
    return one("identity.permissions", id);
  }

  @DeleteMapping("/permissions/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void deletePermission(@PathVariable long id) {
    changed(
      db
        .sql("delete from identity.permissions where id=:id")
        .param("id", id)
        .update(),
      "Permission"
    );
  }

  private List<Map<String, Object>> list(String table) {
    return db
      .sql("select * from " + table + " order by id")
      .query()
      .listOfRows();
  }

  private Map<String, Object> one(String table, long id) {
    var rows = db
      .sql("select * from " + table + " where id=:id")
      .param("id", id)
      .query()
      .listOfRows();
    if (rows.isEmpty()) throw new BusinessException("Resource not found");
    return rows.getFirst();
  }

  private void changed(int count, String type) {
    if (count == 0) throw new BusinessException(type + " not found");
  }
}
