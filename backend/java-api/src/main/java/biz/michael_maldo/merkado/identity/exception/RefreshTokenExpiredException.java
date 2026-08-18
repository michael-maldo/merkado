package biz.michael_maldo.merkado.identity.exception;

public class RefreshTokenExpiredException extends RuntimeException {

  public RefreshTokenExpiredException() {
    super("Refresh token expired");
  }
}
