package biz.michael_maldo.merkado.identity.exception;

public class UserNotFoundException
        extends RuntimeException {

    public UserNotFoundException() {

        super("User not found");
    }
}