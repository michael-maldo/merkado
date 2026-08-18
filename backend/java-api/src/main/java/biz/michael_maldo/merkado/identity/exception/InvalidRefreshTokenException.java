package biz.michael_maldo.merkado.identity.exception;

public class InvalidRefreshTokenException extends RuntimeException {

  public InvalidRefreshTokenException() {
    super("Invalid refresh token");
  }
}
