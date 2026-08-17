package biz.michael_maldo.merkado.clients.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(schema = "clients", name = "clients")
@Getter @Setter @NoArgsConstructor
public class Client {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String phone;
    @Column(nullable = false, length = 500) private String address;
    @Column(name = "social_handle") private String socialHandle;
    private String email;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
