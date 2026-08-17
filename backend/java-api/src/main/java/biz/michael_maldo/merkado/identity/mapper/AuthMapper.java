package biz.michael_maldo.merkado.identity.mapper;

import biz.michael_maldo.merkado.identity.dto.response.CurrentUserResponse;
import biz.michael_maldo.merkado.identity.entity.User;

import org.springframework.stereotype.Component;

@Component
public class AuthMapper {

    public CurrentUserResponse toCurrentUserResponse(
            User user
    ) {

        return new CurrentUserResponse(

                user.getId(),

                user.getUsername(),

                user.getRoles()
                        .stream()
                        .map(role -> role.getName())
                        .toList()
        );
    }
}