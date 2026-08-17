package biz.michael_maldo.merkado.shared.exception;

import biz.michael_maldo.merkado.identity.exception.*;

import biz.michael_maldo.merkado.shared.dto.ErrorResponse;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> business(BusinessException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream().findFirst().map(e -> e.getField() + ": " + e.getDefaultMessage()).orElse("Invalid request");
        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException ex, HttpServletRequest request) {
        String details = ex.getMostSpecificCause().getMessage();
        String message = details != null && details.contains("uk_categories_sibling_name_ci")
                ? "A category with this name already exists under the selected parent."
                : details != null && details.contains("uk_categories_root_name_ci")
                ? "A top-level category with this name already exists."
                : details != null && details.contains("uk_categories_code_ci")
                ? "This category code is already in use."
                : "A record with the same unique value already exists.";
        return build(HttpStatus.CONFLICT, message, request);
    }

    @ExceptionHandler(
            InvalidCredentialsException.class
    )
    public ResponseEntity<ErrorResponse>
    invalidCredentials(
            InvalidCredentialsException ex,
            HttpServletRequest request
    ) {

        return build(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage(),
                request
        );
    }

    @ExceptionHandler(
            UserNotFoundException.class
    )
    public ResponseEntity<ErrorResponse>
    userNotFound(
            UserNotFoundException ex,
            HttpServletRequest request
    ) {

        return build(
                HttpStatus.NOT_FOUND,
                ex.getMessage(),
                request
        );
    }

    @ExceptionHandler(
            InvalidRefreshTokenException.class
    )
    public ResponseEntity<ErrorResponse>
    invalidRefresh(
            InvalidRefreshTokenException ex,
            HttpServletRequest request
    ) {

        return build(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage(),
                request
        );
    }

    @ExceptionHandler(
            RefreshTokenExpiredException.class
    )
    public ResponseEntity<ErrorResponse>
    expiredRefresh(
            RefreshTokenExpiredException ex,
            HttpServletRequest request
    ) {

        return build(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage(),
                request
        );
    }

    private ResponseEntity<ErrorResponse>
    build(
            HttpStatus status,
            String message,
            HttpServletRequest request
    ) {

        return ResponseEntity
                .status(status)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now(),
                                status.value(),
                                status.getReasonPhrase(),
                                message,
                                request.getRequestURI()
                        )
                );
    }
}
