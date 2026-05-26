package biz.michael_maldo.merkado.identity.repository;

import biz.michael_maldo.merkado.identity.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository
        extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
}
