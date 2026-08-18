package biz.michael_maldo.merkado.shared.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

  private final JdbcClient db;
  private final ObjectMapper json;

  @AfterReturning(
    "within(@org.springframework.web.bind.annotation.RestController *) && " +
      "(@annotation(org.springframework.web.bind.annotation.PostMapping) || @annotation(org.springframework.web.bind.annotation.PatchMapping) || @annotation(org.springframework.web.bind.annotation.PutMapping) || @annotation(org.springframework.web.bind.annotation.DeleteMapping))"
  )
  public void record(JoinPoint point) {
    try {
      var attrs =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
      if (attrs == null) return;
      HttpServletRequest request = attrs.getRequest();
      Authentication auth =
        SecurityContextHolder.getContext().getAuthentication();
      String username = auth == null ? null : auth.getName();
      String path = request.getRequestURI();
      String[] parts = path.split("/");
      String resource = parts.length > 3 ? parts[3] : "unknown";
      String resourceId = parts.length > 4 ? parts[4] : null;
      String details = json.writeValueAsString(
        Map.of("handler", point.getSignature().toShortString(), "path", path)
      );
      db.sql(
        "insert into audit.audit_logs(username,action,resource_type,resource_id,details) values(:u,:a,:r,:i,cast(:d as jsonb))"
      )
        .param("u", username == null ? "anonymous" : username)
        .param("a", request.getMethod())
        .param("r", resource)
        .param("i", resourceId == null ? "" : resourceId)
        .param("d", details)
        .update();
    } catch (Exception ignored) {
      // Auditing must never change the outcome of the business request.
    }
  }
}
