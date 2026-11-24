package com.sistema.os.controller;
import com.sistema.os.dto.*;
import com.sistema.os.service.ClienteService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
// Controller: endpoints de /clientes
@RestController
@RequestMapping("/clientes")
public class ClienteController {
    private final ClienteService clienteService;
    public ClienteController(ClienteService clienteService) { this.clienteService = clienteService; }
    @GetMapping public List<ClienteResponseDTO> listar() { return clienteService.listarTodos(); }
    @GetMapping("/{id}") public ClienteResponseDTO buscar(@PathVariable Long id) { return clienteService.buscarPorId(id); }
    @PostMapping public ResponseEntity<ClienteResponseDTO> cadastrar(@Valid @RequestBody ClienteRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.salvar(dto));
    }
    @PutMapping("/{id}") public ClienteResponseDTO atualizar(@PathVariable Long id, @Valid @RequestBody ClienteAtualizacaoDTO dto) {
        return clienteService.atualizar(id, dto);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) { clienteService.excluir(id); }
}
