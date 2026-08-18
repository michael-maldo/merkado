package biz.michael_maldo.merkado.identity.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(schema = "identity", name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String name;
}
