package biz.michael_maldo.merkado.shared.util;

import biz.michael_maldo.merkado.identity.entity.Role;
import biz.michael_maldo.merkado.identity.entity.User;

import biz.michael_maldo.merkado.identity.repository.RoleRepository;
import biz.michael_maldo.merkado.identity.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.CommandLineRunner;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder
        implements CommandLineRunner {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        if (
                userRepository
                        .findByUsername("admin")
                        .isPresent()
        ) {
            return;
        }

        Role managementRole =
                roleRepository
                        .findByName("MANAGEMENT")
                        .orElseThrow();

        User admin = new User();

        admin.setUsername("admin");

        admin.setPassword(
                passwordEncoder.encode("password")
        );

        admin.getRoles().add(managementRole);

        userRepository.save(admin);
    }
}
