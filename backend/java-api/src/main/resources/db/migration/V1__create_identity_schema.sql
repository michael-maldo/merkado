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

                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

INSERT INTO identity.roles(name)
VALUES
    ('MANAGEMENT'),
    ('SALES_AGENT'),
    ('WAREHOUSE');