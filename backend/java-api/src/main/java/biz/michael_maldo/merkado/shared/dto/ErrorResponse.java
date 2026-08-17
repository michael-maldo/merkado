package biz.michael_maldo.merkado.shared.dto;

import java.time.LocalDateTime;

public record ErrorResponse(

        LocalDateTime timestamp,

        Integer status,

        String error,

        String message,

        String path

) {
}