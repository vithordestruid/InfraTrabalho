# Sistema de Ordem de Serviço (tema: loja de celulares, Cell Point)

API REST com Spring Boot 4, Java 17, Maven e PostgreSQL, com front-end em HTML/CSS/JS puro servido pelo próprio Spring.

## Pré-requisitos
JDK 17, Maven, PostgreSQL e as extensões Java/Spring Boot do VS Code.

## Banco de dados
No pgAdmin execute:
```sql
CREATE DATABASE ordemservicodb;
```
O `application.properties` usa usuário `postgres` e senha `123`. As tabelas são criadas e ajustadas sozinhas por `ddl-auto=update`.

## Executar
Pelo VS Code: abra `SistemaOrdemServicoApplication.java` e clique em Run (ou F5). Pelo terminal, na raiz do projeto:
```bash
mvn spring-boot:run
```
Quando aparecer `Started SistemaOrdemServicoApplication`, abra **http://localhost:8080** (front) ou chame a API direto.

## Arquitetura
Pacotes em `com.sistema.os`: `controller`, `service`, `repository`, `entity`, `dto`, `enums` e `exception` (tratamento global de erros).

## Entidades e CRUD completo
| Entidade | Base | GET (lista) | GET por id | POST | PUT | DELETE |
|---|---|---|---|---|---|---|
| Cliente | `/clientes` | sim | sim | sim | sim | sim |
| Técnico (vendedor) | `/tecnicos` | sim | sim | sim | sim | sim |
| Veículo | `/veiculos` | sim | sim | sim | sim | sim |
| OrdemServico (negociação) | `/ordens` | sim | sim | sim | sim | sim |

Endpoints extras de `/ordens`: `GET ?status=`, `GET /prioridade/{p}`, `GET /cliente/{id}`, `PUT /{id}/tecnico/{tecnicoId}`, `PUT /{id}/concluir?valor=` e `PUT /{id}/cancelar`.

## Regras de negócio
1. Dois clientes não podem ter o mesmo CPF.
2. A OS só abre para cliente cadastrado.
3. Ao abrir, a OS recebe data de abertura e status ABERTA.
4. OS CONCLUIDA ou CANCELADA não pode mais ser alterada (vale também para o PUT).
5. Ao atribuir técnico, a OS vai para EM_ANDAMENTO.
6. Só conclui OS que tenha técnico.
7. Ao concluir, recebe valor, data de fechamento e status CONCLUIDA.
8. Ao cancelar, recebe data de fechamento e status CANCELADA.
9. Cliente com OS não pode ser excluído.
10. O valor ao concluir deve ser maior que zero.
11. Cadastrar de novo o mesmo veículo (marca, modelo, ano, cor e km) não cria outro registro: a quantidade é somada ao estoque existente.
12. Veículo com unidade reservada em negociação ativa não pode ser excluído.
13. Só abre negociação se houver unidade livre: quantidade em estoque menos as unidades reservadas em OS ativas (ABERTA ou EM_ANDAMENTO) tem que ser maior que zero.
14. OS CONCLUIDA não pode ser excluída (é o registro do negócio fechado).
15. Técnico com OS atribuída não pode ser excluído.
16. Ao concluir (fechar) uma venda, a quantidade em estoque diminui em 1. Vendida a última unidade, o veículo é excluído da tabela `veiculos` (a negociação guarda uma cópia da descrição dele no campo `veiculoDescricao`).
17. A quantidade de um veículo não pode ser editada para menos que as unidades reservadas em negociações ativas.
18. Venda ou revenda só pode ser cadastrada para um veículo que exista no estoque: informando `tipo`, o `veiculoId` é obrigatório, e o veículo precisa ter unidade livre (regra 13).

## Erros padronizados
Todo erro volta no mesmo formato (classe `ApiExceptionHandler`, com `@RestControllerAdvice`):
```json
{"timestamp":"2026-11-05T20:00:00","status":400,"error":"Bad Request","message":"Não há unidade disponível deste veículo no estoque","path":"/veiculos","campos":null}
```
Erros de validação (`@Valid`) trazem a lista `campos` com o nome e a mensagem de cada campo inválido. Status usados: 400 (validação ou regra), 404 (não encontrado), 409 (conflito no banco) e 500 (erro inesperado).

## Exemplos de requisição (Content-Type: application/json)
O corpo da OS aceita o cliente como `"clienteId": 1` ou como `"cliente": {"id": 1}` (formato dos slides); o veículo vai em `veiculoId` e é opcional.

1. `POST /clientes` `{"nome":"Maria Souza","cpf":"123.456.789-00","telefone":"(45) 99999-0000","email":"maria@email.com"}` retorna 201.
2. Repetir o POST anterior retorna 400 (regra 1).
3. `POST /tecnicos` `{"nome":"Joao Lima","especialidade":"Seminovos","telefone":"(45) 98888-1111"}` retorna 201.
4. `POST /veiculos` `{"marca":"Honda","modelo":"Civic EXL","ano":2019,"cor":"Prata","quilometragem":48200,"quantidade":5,"preco":112900.00}` retorna 201.
5. `POST /ordens` `{"descricao":"Venda de Honda Civic","prioridade":"ALTA","tipo":"VENDA","clienteId":99,"veiculoId":1}` retorna 404 (o mesmo vale para `"cliente":{"id":99}`).
6. `POST /ordens` `{"descricao":"Venda de Honda Civic","prioridade":"ALTA","tipo":"VENDA","clienteId":1,"veiculoId":1}` retorna 201 com status ABERTA.
7. Com `quantidade` 1, repetir o POST anterior retorna 400 (regra 13, sem unidade livre).
8. `PUT /ordens/1/concluir?valor=112900.00` retorna 400 (sem técnico).
9. `PUT /ordens/1/tecnico/1` deixa a OS EM_ANDAMENTO.
10. `PUT /ordens/1` `{"descricao":"Venda com troca","prioridade":"MEDIA","tipo":"VENDA","clienteId":1,"veiculoId":1}` retorna 200.
11. `PUT /ordens/1/concluir?valor=112900.00` retorna CONCLUIDA.
12. `DELETE /ordens/1` retorna 400 (regra 14).
13. `DELETE /veiculos/1` e `DELETE /clientes/1` retornam 400 (regras 12 e 9).
14. `GET /ordens/prioridade/ALTA` lista as OS de alta prioridade.

Os IDs dependem dos dados já existentes no banco. Para rodar todos os testes de uma vez, sem Postman, use o script `testes.ps1` (veja abaixo).

## Teste automático dos endpoints
Com a aplicação rodando, em outro terminal do VS Code, na raiz do projeto:
```powershell
powershell -ExecutionPolicy Bypass -File .\testes.ps1
```
O script cria seus próprios dados, confere o status HTTP esperado de cada endpoint e regra, e mostra OK ou FALHOU no final.

## Front-end (Cell Point)
Fica em `src/main/resources/static`, sem instalar nada. Telas: Painel, Negociações, Estoque (aparelhos com quantidade, reservados e disponíveis), Clientes e Vendedores. No Painel, o botão "Carregar dados de exemplo" cria dados de demonstração.

Vocabulário do tema sobre a API: Técnico = Vendedor, OrdemServico = Negociação, Prioridade = Interesse do cliente, e os status viram Aberta, Em negociação, Fechada e Cancelada. Os nomes dos endpoints e das classes seguem os slides do professor (ordens, tecnicos).


Observação sobre o tema: o back-end continua com os nomes `Veiculo`/`/veiculos`; no front, o veículo aparece como aparelho celular (a coluna `quilometragem` guarda o armazenamento em GB) e a revenda aparece como compra de aparelho usado.
