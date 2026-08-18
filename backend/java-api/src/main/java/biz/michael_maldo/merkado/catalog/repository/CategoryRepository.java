package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.Category;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
  Optional<Category> findByCodeIgnoreCase(String code);
}
