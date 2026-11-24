package com.sistema.os.controller;
import com.sistema.os.dto.*;
import com.sistema.os.service.TecnicoService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
// Controller: endpoints de /tecnicos
@RestController
@RequestMapping("/tecnicos")
public class TecnicoController {
    private final TecnicoService tecnicoService;
    public TecnicoController(TecnicoService tecnicoService) { this.tecnicoService = tecnicoService; }
    @GetMapping public List<TecnicoResponseDTO> listar() { return tecnicoService.listarTodos(); }
    @GetMapping("/{id}") public TecnicoResponseDTO buscar(@PathVariable Long id) { return tecnicoService.buscarPorId(id); }
    @PostMapping public ResponseEntity<TecnicoResponseDTO> cadastrar(@Valid @RequestBody TecnicoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tecnicoService.salvar(dto));
    }
    @PutMapping("/{id}") public TecnicoResponseDTO atualizar(@PathVariable Long id, @Valid @RequestBody TecnicoRequestDTO dto) {
        return tecnicoService.atualizar(id, dto);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) { tecnicoService.excluir(id); }
}
