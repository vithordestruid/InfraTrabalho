package com.sistema.os.controller;
import com.sistema.os.dto.*;
import com.sistema.os.enums.*;
import com.sistema.os.service.OrdemServicoService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
// Controller: endpoints de /ordens (CRUD, atribuir técnico, concluir e cancelar)
@RestController
@RequestMapping("/ordens")
public class OrdemServicoController {
    private final OrdemServicoService ordemServicoService;
    public OrdemServicoController(OrdemServicoService ordemServicoService) { this.ordemServicoService = ordemServicoService; }
    @GetMapping public List<OrdemServicoResponseDTO> listar(@RequestParam(required = false) StatusOS status) {
        return status == null ? ordemServicoService.listarTodas() : ordemServicoService.listarPorStatus(status);
    }
    @GetMapping("/prioridade/{prioridade}") public List<OrdemServicoResponseDTO> listarPorPrioridade(@PathVariable Prioridade prioridade) {
        return ordemServicoService.listarPorPrioridade(prioridade);
    }
    @GetMapping("/cliente/{clienteId}") public List<OrdemServicoResponseDTO> listarPorCliente(@PathVariable Long clienteId) {
        return ordemServicoService.listarPorCliente(clienteId);
    }
    @GetMapping("/{id}") public OrdemServicoResponseDTO buscar(@PathVariable Long id) { return ordemServicoService.buscarPorId(id); }
    @PostMapping public ResponseEntity<OrdemServicoResponseDTO> abrir(@Valid @RequestBody OrdemServicoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ordemServicoService.abrir(dto));
    }
    @PutMapping("/{id}") public OrdemServicoResponseDTO atualizar(@PathVariable Long id, @Valid @RequestBody OrdemServicoRequestDTO dto) {
        return ordemServicoService.atualizar(id, dto);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) { ordemServicoService.excluir(id); }
    @PutMapping("/{id}/tecnico/{tecnicoId}") public OrdemServicoResponseDTO atribuirTecnico(@PathVariable Long id, @PathVariable Long tecnicoId) {
        return ordemServicoService.atribuirTecnico(id, tecnicoId);
    }
    @PutMapping("/{id}/concluir") public OrdemServicoResponseDTO concluir(@PathVariable Long id, @RequestParam(required = false) BigDecimal valor) {
        return ordemServicoService.concluir(id, valor);
    }
    @PutMapping("/{id}/cancelar") public OrdemServicoResponseDTO cancelar(@PathVariable Long id) {
        return ordemServicoService.cancelar(id);
    }
}
