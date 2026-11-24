package com.sistema.os.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
// Entity: tabela de veículos (estoque, com quantidade)
@Entity
@Table(name = "veiculos")
public class Veiculo {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
@Column(nullable = false, length = 60)
private String marca;
@Column(nullable = false, length = 60)
private String modelo;
@Column(nullable = false)
private Integer ano;
@Column(length = 30)
private String cor;
private Integer quilometragem;
@Column(nullable = false)
private Integer quantidade = 0;
@Column(precision = 12, scale = 2)
private BigDecimal preco;
public Long getId() { return id; }
public void setId(Long id) { this.id = id; }
public String getMarca() { return marca; }
public void setMarca(String marca) { this.marca = marca; }
public String getModelo() { return modelo; }
public void setModelo(String modelo) { this.modelo = modelo; }
public Integer getAno() { return ano; }
public void setAno(Integer ano) { this.ano = ano; }
public String getCor() { return cor; }
public void setCor(String cor) { this.cor = cor; }
public Integer getQuilometragem() { return quilometragem; }
public void setQuilometragem(Integer quilometragem) { this.quilometragem = quilometragem; }
public Integer getQuantidade() { return quantidade; }
public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
public BigDecimal getPreco() { return preco; }
public void setPreco(BigDecimal preco) { this.preco = preco; }
}
