package com.sistema.os.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/** Tratamento global de erros: toda falha vira um JSON padronizado (ApiError). */
// Tratamento global de erros: 400, 404, 409 e 500
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private ResponseEntity<ApiError> montar(HttpStatusCode status, String mensagem, HttpServletRequest req,
                                            List<ApiError.CampoInvalido> campos) {
        HttpStatus http = HttpStatus.resolve(status.value());
        String motivo = http != null ? http.getReasonPhrase() : "Erro";
        ApiError corpo = new ApiError(LocalDateTime.now(), status.value(), motivo, mensagem,
            req.getRequestURI(), campos);
        return ResponseEntity.status(status).body(corpo);
    }

    // Regras de negócio e "não encontrado" lançados pelos services
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> regraDeNegocio(ResponseStatusException ex, HttpServletRequest req) {
        String msg = ex.getReason() != null ? ex.getReason() : "Requisição inválida";
        return montar(ex.getStatusCode(), msg, req, null);
    }

    // Bean Validation (@Valid) nos DTOs: devolve a lista dos campos com problema
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacao(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<ApiError.CampoInvalido> campos = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> new ApiError.CampoInvalido(f.getField(), f.getDefaultMessage()))
            .toList();
        String resumo = campos.isEmpty() ? "Dados inválidos"
            : "Dados inválidos: " + campos.stream().map(c -> c.campo() + " " + c.mensagem())
                .reduce((a, b) -> a + "; " + b).orElse("");
        return montar(HttpStatus.BAD_REQUEST, resumo, req, campos);
    }

    // JSON malformado ou valor de enum inexistente no corpo
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> corpoIlegivel(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return montar(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido ou mal formatado", req, null);
    }

    // Parâmetro de URL com tipo errado (ex.: /ordens/abc ou prioridade inexistente)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> tipoDeParametro(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return montar(HttpStatus.BAD_REQUEST, "Valor inválido para o parâmetro '" + ex.getName() + "'", req, null);
    }

    // Violação de chave estrangeira ou campo único no banco
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> conflito(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Conflito de integridade: {}", ex.getMostSpecificCause().getMessage());
        return montar(HttpStatus.CONFLICT, "Operação não permitida: o registro está em uso ou duplica outro", req, null);
    }

    // Qualquer outra falha. Erros do próprio Spring (404 de rota, 405...) mantêm o status original.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> inesperado(Exception ex, HttpServletRequest req) {
        if (ex instanceof ErrorResponse er) {
            String detalhe = er.getBody().getDetail();
            return montar(er.getStatusCode(), detalhe != null ? detalhe : "Requisição inválida", req, null);
        }
        log.error("Erro inesperado em {}", req.getRequestURI(), ex);
        return montar(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor", req, null);
    }
}
