package biz.michael_maldo.merkado.identity.dto.response;

import java.util.List;

public record CurrentUserResponse(
  Long id,

  String username,

  List<String> roles
) {}
