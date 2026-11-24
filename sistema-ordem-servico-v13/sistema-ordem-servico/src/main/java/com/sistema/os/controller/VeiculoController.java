package com.sistema.os.controller;
import com.sistema.os.dto.*;
import com.sistema.os.service.VeiculoService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
// Controller: endpoints de /veiculos
@RestController
@RequestMapping("/veiculos")
public class VeiculoController {
    private final VeiculoService veiculoService;
    public VeiculoController(VeiculoService veiculoService) { this.veiculoService = veiculoService; }
    @GetMapping public List<VeiculoResponseDTO> listar() { return veiculoService.listarTodos(); }
    @GetMapping("/{id}") public VeiculoResponseDTO buscar(@PathVariable Long id) { return veiculoService.buscarPorId(id); }
    @PostMapping public ResponseEntity<VeiculoResponseDTO> cadastrar(@Valid @RequestBody VeiculoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(veiculoService.salvar(dto));
    }
    @PutMapping("/{id}") public VeiculoResponseDTO atualizar(@PathVariable Long id, @Valid @RequestBody VeiculoRequestDTO dto) {
        return veiculoService.atualizar(id, dto);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) { veiculoService.excluir(id); }
}
