package com.sistema.os.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.sistema.os.enums.*;
// Entity: tabela de ordens de serviço (negociações no front)
@Entity
@Table(name = "ordens_servico")
public class OrdemServico {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
@Column(nullable = false, length = 500)
private String descricao;
@Column(name = "data_abertura", nullable = false)
private LocalDateTime dataAbertura;
@Column(name = "data_fechamento")
private LocalDateTime dataFechamento;
@Column(precision = 10, scale = 2)
private BigDecimal valor;
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private StatusOS status;
@Enumerated(EnumType.STRING)
@Column(length = 10)
private Prioridade prioridade;
@ManyToOne(optional = false)
@JoinColumn(name = "cliente_id", nullable = false)
private Cliente cliente;
@ManyToOne
@JoinColumn(name = "tecnico_id")
private Tecnico tecnico;
@Enumerated(EnumType.STRING)
@Column(length = 10)
private TipoNegociacao tipo;
@ManyToOne
@JoinColumn(name = "veiculo_id")
private Veiculo veiculo;
// Cópia da descrição do veículo, para o histórico
@Column(name = "veiculo_descricao", length = 200)
private String veiculoDescricao;
public Long getId() { return id; }
public void setId(Long id) { this.id = id; }
public String getDescricao() { return descricao; }
public void setDescricao(String descricao) { this.descricao = descricao; }
public LocalDateTime getDataAbertura() { return dataAbertura; }
public void setDataAbertura(LocalDateTime dataAbertura) { this.dataAbertura = dataAbertura; }
public LocalDateTime getDataFechamento() { return dataFechamento; }
public void setDataFechamento(LocalDateTime dataFechamento) { this.dataFechamento = dataFechamento; }
public BigDecimal getValor() { return valor; }
public void setValor(BigDecimal valor) { this.valor = valor; }
public StatusOS getStatus() { return status; }
public void setStatus(StatusOS status) { this.status = status; }
public Prioridade getPrioridade() { return prioridade; }
public void setPrioridade(Prioridade prioridade) { this.prioridade = prioridade; }
public Cliente getCliente() { return cliente; }
public void setCliente(Cliente cliente) { this.cliente = cliente; }
public TipoNegociacao getTipo() { return tipo; }
public void setTipo(TipoNegociacao tipo) { this.tipo = tipo; }
public Veiculo getVeiculo() { return veiculo; }
public void setVeiculo(Veiculo veiculo) { this.veiculo = veiculo; }
public String getVeiculoDescricao() { return veiculoDescricao; }
public void setVeiculoDescricao(String veiculoDescricao) { this.veiculoDescricao = veiculoDescricao; }
public Tecnico getTecnico() { return tecnico; }
public void setTecnico(Tecnico tecnico) { this.tecnico = tecnico; }
}
