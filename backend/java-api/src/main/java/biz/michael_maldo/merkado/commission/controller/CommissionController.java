package biz.michael_maldo.merkado.commission.controller;

import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class CommissionController {
 private final JdbcClient db; public record Rule(@NotBlank String name,@NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percentage,Boolean active){} public record CommissionUpdate(@NotBlank String status,@DecimalMin("0") BigDecimal amount){}
 @GetMapping("/commissions") @PreAuthorize("hasRole('MANAGEMENT')") public List<Map<String,Object>> commissions(){return list("commission.commissions");}
 @GetMapping("/commissions/{id}") public Map<String,Object> commission(@PathVariable long id){return one("commission.commissions",id);}
 @GetMapping("/commissions/agents/{agentId}") public List<Map<String,Object>> agent(@PathVariable long agentId){return db.sql("select * from commission.commissions where agent_id=:id order by created_at desc").param("id",agentId).query().listOfRows();}
 @PatchMapping("/commissions/{id}") @PreAuthorize("hasRole('MANAGEMENT')") @Transactional public Map<String,Object> updateCommission(@PathVariable long id,@Valid @RequestBody CommissionUpdate r){int n=db.sql("update commission.commissions set status=:s,amount=coalesce(:a,amount),updated_at=now() where id=:id").param("s",r.status()).param("a",r.amount()==null?BigDecimal.ZERO:r.amount()).param("id",id).update();changed(n);return commission(id);}
 @GetMapping("/commission-rules") public List<Map<String,Object>> rules(){return list("commission.commission_rules");}
 @PostMapping("/commission-rules") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('MANAGEMENT')") @Transactional public Map<String,Object> createRule(@Valid @RequestBody Rule r){long id=db.sql("insert into commission.commission_rules(name,percentage,active) values(:n,:p,:a) returning id").param("n",r.name()).param("p",r.percentage()).param("a",r.active()==null||r.active()).query(Long.class).single();return one("commission.commission_rules",id);}
 @PatchMapping("/commission-rules/{id}") @PreAuthorize("hasRole('MANAGEMENT')") @Transactional public Map<String,Object> updateRule(@PathVariable long id,@Valid @RequestBody Rule r){changed(db.sql("update commission.commission_rules set name=:n,percentage=:p,active=:a,updated_at=now() where id=:id").param("n",r.name()).param("p",r.percentage()).param("a",r.active()==null||r.active()).param("id",id).update());return one("commission.commission_rules",id);}
 @DeleteMapping("/commission-rules/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasRole('MANAGEMENT')") @Transactional public void deleteRule(@PathVariable long id){changed(db.sql("update commission.commission_rules set active=false,updated_at=now() where id=:id").param("id",id).update());}
 private List<Map<String,Object>> list(String t){return db.sql("select * from "+t+" order by created_at desc").query().listOfRows();} private Map<String,Object> one(String t,long id){var r=db.sql("select * from "+t+" where id=:id").param("id",id).query().listOfRows();if(r.isEmpty())throw new BusinessException("Resource not found");return r.getFirst();}private void changed(int n){if(n==0)throw new BusinessException("Resource not found");}
}
