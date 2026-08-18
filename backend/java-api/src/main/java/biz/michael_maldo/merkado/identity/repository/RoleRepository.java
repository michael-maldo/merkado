package biz.michael_maldo.merkado.identity.repository;

import biz.michael_maldo.merkado.identity.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
  Optional<Role> findByName(String name);
}
