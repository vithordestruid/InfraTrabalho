package com.sistema.os.exception;

import java.time.LocalDateTime;
import java.util.List;

/** Formato único de resposta para qualquer erro da API. */
// Formato padrão da resposta de erro (JSON)
public record ApiError(
    LocalDateTime timestamp,
    int status,
    String error,
    String message,
    String path,
    List<CampoInvalido> campos
) {
    public record CampoInvalido(String campo, String mensagem) {}
}
