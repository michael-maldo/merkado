package biz.michael_maldo.merkado.shared.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SystemController {

  private final JdbcClient db;

  @Value("${spring.application.name:merkado}")
  private String name;

  @GetMapping("/health")
  public Map<String, Object> health() {
    Integer ok = db.sql("select 1").query(Integer.class).single();
    return Map.of(
      "status",
      ok == 1 ? "UP" : "DOWN",
      "timestamp",
      Instant.now()
    );
  }

  @GetMapping("/version")
  public Map<String, Object> version() {
    return Map.of(
      "name",
      name,
      "apiVersion",
      "v1",
      "applicationVersion",
      "0.0.1-SNAPSHOT"
    );
  }

  @GetMapping("/system/status")
  public ResponseEntity<Map<String, Object>> status() {
    try {
      Integer ok = db.sql("select 1").query(Integer.class).single();
      boolean databaseUp = ok != null && ok == 1;
      return ResponseEntity.status(
        databaseUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE
      ).body(
        Map.of(
          "status",
          databaseUp ? "OPERATIONAL" : "DEGRADED",
          "api",
          "UP",
          "database",
          databaseUp ? "UP" : "DOWN",
          "timestamp",
          Instant.now()
        )
      );
    } catch (RuntimeException exception) {
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
        Map.of(
          "status",
          "DEGRADED",
          "api",
          "UP",
          "database",
          "DOWN",
          "timestamp",
          Instant.now()
        )
      );
    }
  }

  @GetMapping("/audit-logs")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public List<Map<String, Object>> audit(
    @RequestParam(defaultValue = "100") int limit
  ) {
    int safe = Math.max(1, Math.min(limit, 500));
    return db
      .sql("select * from audit.audit_logs order by created_at desc limit :n")
      .param("n", safe)
      .query()
      .listOfRows();
  }
}
