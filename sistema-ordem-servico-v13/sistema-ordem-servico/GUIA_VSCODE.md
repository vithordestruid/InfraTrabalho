# Sistema de Ordem de Serviço — VS Code

Projeto organizado com base nos slides fornecidos, preservando os pacotes existentes `com.sistema.os` e `entity`.

## Abrir
1. Extraia o ZIP.
2. No VS Code, escolha **Arquivo > Abrir Pasta** e abra `sistema-ordem-servico` (a pasta que contém `pom.xml`).
3. Instale **Extension Pack for Java** e **Spring Boot Extension Pack**.
4. Use Java 17 ou superior e Maven instalado (`mvn -version`).
5. No pgAdmin, crie o banco `ordemservicodb` se ainda não existir.
6. Confira `src/main/resources/application.properties` (localhost:5432, usuário postgres, senha 123, conforme seus arquivos).
7. No terminal aberto na raiz, execute `mvn clean package` e `mvn spring-boot:run`.

## Testar
Use Postman/Insomnia em http://localhost:8080 com `Content-Type: application/json`.

1. `POST /clientes` com `{"nome":"Maria Souza","cpf":"123.456.789-00","telefone":"(41) 99999-0000","email":"maria@email.com"}`.
2. Repita a requisição para conferir erro 400 por CPF duplicado.
3. `POST /tecnicos` com `{"nome":"João Lima","especialidade":"Notebooks","telefone":"(41) 98888-1111"}`.
4. `POST /ordens` com `{"descricao":"Notebook não liga","prioridade":"ALTA","cliente":{"id":1}}`.
5. `PUT /ordens/1/concluir?valor=250.00` deve falhar antes de atribuir técnico.
6. `PUT /ordens/1/tecnico/1` passa para EM_ANDAMENTO.
7. `PUT /ordens/1/concluir?valor=250.00` conclui.
8. `PUT /ordens/1/cancelar` deve falhar porque já foi concluída.
9. `GET /ordens/prioridade/ALTA` filtra pela prioridade (exercício).
10. `DELETE /clientes/1` deve falhar se tiver OS (regra 9).
11. Em outra OS com técnico, `PUT /ordens/2/concluir?valor=0` deve falhar (regra 10).

IDs dos exemplos pressupõem banco recém-criado; use os IDs retornados pelo servidor se forem diferentes.

## Organização
- `src/main/java/com/sistema/os/SistemaOrdemServicoApplication.java`: inicialização.
- `entity/`: Cliente, Tecnico, OrdemServico.
- `enums/`: StatusOS, Prioridade.
- `repository/`: interfaces Spring Data JPA.
- `service/`: regras de negócio 1 a 10.
- `controller/`: rotas HTTP.
- `src/main/resources/application.properties`: PostgreSQL e JPA.
- `pom.xml`: dependências Maven.

**Observação:** o slide usa `com.exemplo.ordemservico.model`; este projeto usa `com.sistema.os.entity` para respeitar os arquivos que você já criou. O código foi organizado, mas a compilação Maven não foi executada neste ambiente.
