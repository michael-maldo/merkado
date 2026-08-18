package biz.michael_maldo.merkado.clients.controller;

import biz.michael_maldo.merkado.clients.entity.Client;
import biz.michael_maldo.merkado.clients.repository.ClientRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/clients")
@RequiredArgsConstructor
public class ClientController {

  private final ClientRepository clients;
  private final JdbcClient db;

  public record Request(
    @NotBlank String name,
    @NotBlank String phone,
    @NotBlank String address,
    String socialHandle,
    String email
  ) {}

  public record Update(
    String name,
    String phone,
    String address,
    String socialHandle,
    String email,
    Boolean active
  ) {}

  public record Address(
    @NotBlank String label,
    @NotBlank String line1,
    String line2,
    @NotBlank String city,
    String state,
    String postalCode,
    @NotBlank String country,
    Boolean isDefault
  ) {}

  @GetMapping
  public List<Client> list() {
    return clients.findAll();
  }

  @GetMapping("/search")
  public List<Client> search(@RequestParam String q) {
    String t = q.toLowerCase(Locale.ROOT);
    return clients
      .findAll()
      .stream()
      .filter(
        c ->
          c.getName().toLowerCase(Locale.ROOT).contains(t) ||
          c.getPhone().toLowerCase(Locale.ROOT).contains(t) ||
          (c.getEmail() != null &&
            c.getEmail().toLowerCase(Locale.ROOT).contains(t))
      )
      .toList();
  }

  @GetMapping("/{id}")
  public Client get(@PathVariable Long id) {
    return client(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Client create(@Valid @RequestBody Request r) {
    var c = new Client();
    c.setName(r.name().trim());
    c.setPhone(r.phone().trim());
    c.setAddress(r.address().trim());
    c.setSocialHandle(r.socialHandle());
    c.setEmail(r.email());
    return clients.save(c);
  }

  @PatchMapping("/{id}")
  @Transactional
  public Client update(@PathVariable Long id, @RequestBody Update r) {
    var c = client(id);
    if (r.name() != null) c.setName(r.name().trim());
    if (r.phone() != null) c.setPhone(r.phone().trim());
    if (r.address() != null) c.setAddress(r.address().trim());
    if (r.socialHandle() != null) c.setSocialHandle(r.socialHandle());
    if (r.email() != null) c.setEmail(r.email());
    if (r.active() != null) c.setActive(r.active());
    c.setUpdatedAt(LocalDateTime.now());
    return c;
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void archive(@PathVariable Long id) {
    client(id).setActive(false);
  }

  @GetMapping("/{id}/orders")
  public List<Map<String, Object>> orders(@PathVariable long id) {
    client(id);
    return db
      .sql(
        "select * from orders.sales_orders where client_id=:id order by created_at desc"
      )
      .param("id", id)
      .query()
      .listOfRows();
  }

  @GetMapping("/{id}/addresses")
  public List<Map<String, Object>> addresses(@PathVariable long id) {
    client(id);
    return db
      .sql(
        "select * from clients.addresses where client_id=:id order by is_default desc,id"
      )
      .param("id", id)
      .query()
      .listOfRows();
  }

  @PostMapping("/{id}/addresses")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> addAddress(
    @PathVariable long id,
    @Valid @RequestBody Address r
  ) {
    client(id);
    long aid = db
      .sql(
        "insert into clients.addresses(client_id,label,line1,line2,city,state,postal_code,country,is_default) values(:c,:l,:a,:b,:x,:s,:p,:n,:d) returning id"
      )
      .param("c", id)
      .param("l", r.label())
      .param("a", r.line1())
      .param("b", r.line2() == null ? "" : r.line2())
      .param("x", r.city())
      .param("s", r.state() == null ? "" : r.state())
      .param("p", r.postalCode() == null ? "" : r.postalCode())
      .param("n", r.country().toUpperCase())
      .param("d", Boolean.TRUE.equals(r.isDefault()))
      .query(Long.class)
      .single();
    return address(id, aid);
  }

  @PatchMapping("/{id}/addresses/{addressId}")
  @Transactional
  public Map<String, Object> updateAddress(
    @PathVariable long id,
    @PathVariable long addressId,
    @Valid @RequestBody Address r
  ) {
    changed(
      db
        .sql(
          "update clients.addresses set label=:l,line1=:a,line2=:b,city=:x,state=:s,postal_code=:p,country=:n,is_default=:d,updated_at=now() where id=:aid and client_id=:cid"
        )
        .param("l", r.label())
        .param("a", r.line1())
        .param("b", r.line2() == null ? "" : r.line2())
        .param("x", r.city())
        .param("s", r.state() == null ? "" : r.state())
        .param("p", r.postalCode() == null ? "" : r.postalCode())
        .param("n", r.country().toUpperCase())
        .param("d", Boolean.TRUE.equals(r.isDefault()))
        .param("aid", addressId)
        .param("cid", id)
        .update()
    );
    return address(id, addressId);
  }

  @DeleteMapping("/{id}/addresses/{addressId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void deleteAddress(
    @PathVariable long id,
    @PathVariable long addressId
  ) {
    changed(
      db
        .sql("delete from clients.addresses where id=:aid and client_id=:cid")
        .param("aid", addressId)
        .param("cid", id)
        .update()
    );
  }

  private Client client(long id) {
    return clients
      .findById(id)
      .orElseThrow(() -> new BusinessException("Client not found"));
  }

  private void changed(int n) {
    if (n == 0) throw new BusinessException("Address not found");
  }

  private Map<String, Object> address(long c, long a) {
    var rows = db
      .sql("select * from clients.addresses where client_id=:c and id=:a")
      .param("c", c)
      .param("a", a)
      .query()
      .listOfRows();
    if (rows.isEmpty()) throw new BusinessException("Address not found");
    return rows.getFirst();
  }
}
