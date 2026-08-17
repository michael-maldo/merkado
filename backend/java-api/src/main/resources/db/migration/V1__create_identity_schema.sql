CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE identity.roles (
                                id BIGSERIAL PRIMARY KEY,
                                name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE identity.users (
                                id BIGSERIAL PRIMARY KEY,

                                username VARCHAR(100) UNIQUE NOT NULL,
                                password VARCHAR(255) NOT NULL,

                                enabled BOOLEAN NOT NULL DEFAULT TRUE,

                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identity.user_roles (
                                     user_id BIGINT NOT NULL,
                                     role_id BIGINT NOT NULL,

                                     PRIMARY KEY(user_id, role_id),

                                     CONSTRAINT fk_user
                                         FOREIGN KEY(user_id)
                                             REFERENCES identity.users(id),

                                     CONSTRAINT fk_role
                                         FOREIGN KEY(role_id)
                                             REFERENCES identity.roles(id)
);

CREATE TABLE identity.refresh_tokens (
                                         id BIGSERIAL PRIMARY KEY,

                                         token VARCHAR(512) NOT NULL UNIQUE,

                                         user_id BIGINT NOT NULL,

                                         expires_at TIMESTAMP NOT NULL,

                                         revoked BOOLEAN NOT NULL DEFAULT FALSE,

                                         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                         CONSTRAINT fk_user
                                            FOREIGN KEY(user_id)
                                                REFERENCES identity.users(id)
);

INSERT INTO identity.roles(name)
VALUES
    ('MANAGEMENT'),
    ('SALES_AGENT'),
    ('WAREHOUSE');