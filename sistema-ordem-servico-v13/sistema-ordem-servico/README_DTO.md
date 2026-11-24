# DTO no Sistema de Ordem de Serviço

Projeto adaptado dos slides **DTO no Spring Boot**, mantendo `com.sistema.os`, Java 17, Maven, PostgreSQL e as 10 regras de negócio.

## O que mudou

- Novo pacote `src/main/java/com/sistema/os/dto` com records de entrada e saída.
- `ClienteRequestDTO` recebe o CPF no cadastro; `ClienteResponseDTO` **não contém CPF**.
- `ClienteAtualizacaoDTO` atualiza nome, telefone e e-mail, preservando o CPF.
- `OrdemServicoResponseDTO` usa `ClienteResponseDTO` aninhado, impedindo vazamento de CPF nas ordens.
- Controllers só recebem e devolvem DTOs; conversões acontecem nos Services.
- `@Valid` e validações de `jakarta.validation` nos POST/PUT; dependência `spring-boot-starter-validation` adicionada.
- As entidades JPA continuam com seus campos e tabelas originais. Não é preciso recriar o banco.

## Instalação no VS Code

1. Faça backup do seu projeto anterior.
2. Extraia o ZIP e abra a pasta `sistema-ordem-servico` pelo VS Code.
3. Confira `src/main/resources/application.properties` e o banco `ordemservicodb` no PostgreSQL.
4. Na raiz do projeto, execute `mvn clean package` e `mvn spring-boot:run` (ou `./mvnw.cmd` se houver wrapper).
5. Teste em `http://localhost:8080` usando Postman/Insomnia.

## Testes

### POST /clientes
`Content-Type: application/json`

```json
{"nome":"Maria Souza","cpf":"123.456.789-00","telefone":"(45) 99999-0000","email":"maria@email.com"}
```

Retorno HTTP 201 (exemplo):

```json
{"id":1,"nome":"Maria Souza","telefone":"(45) 99999-0000","email":"maria@email.com"}
```

### GET /clientes e GET /clientes/1

Os objetos retornados não possuem a propriedade `cpf`.

### PUT /clientes/1

```json
{"nome":"Maria Atualizada","telefone":"(45) 98888-0000","email":"maria@email.com"}
```

### POST /tecnicos

```json
{"nome":"João Lima","especialidade":"Notebooks","telefone":"(45) 98888-1111"}
```

### POST /ordens

```json
{"descricao":"Notebook não liga","prioridade":"ALTA","clienteId":1}
```

A resposta de `/ordens`, `/ordens/1`, `/ordens?status=ABERTA`, `/ordens/cliente/1` e `/ordens/prioridade/ALTA` inclui cliente sem CPF.

### Fluxo de conclusão

`PUT /ordens/1/tecnico/1` e depois `PUT /ordens/1/concluir?valor=250.00`.

## Observações

- O CPF não é enviado nos JSONs de resposta, mas continua no banco e na requisição de cadastro.
- O DTO não substitui autenticação, autorização, HTTPS e cuidados com logs.
- Para proteger CPF em outras APIs que venham a ser criadas, devolva apenas DTOs também nelas.
- A compilação depende do Maven conseguir baixar as dependências e de o PostgreSQL estar configurado para executar a aplicação.
