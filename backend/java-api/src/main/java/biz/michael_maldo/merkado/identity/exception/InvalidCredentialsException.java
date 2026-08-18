package biz.michael_maldo.merkado.identity.exception;

public class InvalidCredentialsException extends RuntimeException {

  public InvalidCredentialsException() {
    super("Invalid username or password");
  }
}
