# Teste automatico dos endpoints. Uso (com a aplicacao rodando em outro terminal):
#   powershell -ExecutionPolicy Bypass -File .\testes.ps1
param([string]$Base = "http://localhost:8080")

$script:ok = 0
$script:falhas = 0

function Chamar($metodo, $caminho, $corpo = $null) {
    $args2 = @{ Uri = "$Base$caminho"; Method = $metodo; UseBasicParsing = $true }
    if ($null -ne $corpo) {
        $args2.Body = ($corpo | ConvertTo-Json -Compress)
        $args2.ContentType = "application/json"
    }
    try {
        $r = Invoke-WebRequest @args2
        $status = [int]$r.StatusCode
        $texto = $r.Content
    } catch {
        if ($null -eq $_.Exception.Response) { throw "Sem conexao com $Base. A aplicacao esta rodando?" }
        $status = [int]$_.Exception.Response.StatusCode
        $texto = ""
        try {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $texto = $sr.ReadToEnd()
        } catch { }
    }
    $json = $null
    if ($texto) { try { $json = $texto | ConvertFrom-Json } catch { } }
    return [pscustomobject]@{ Status = $status; Json = $json }
}

function Conferir($nome, $resp, $esperado) {
    if ($resp.Status -eq $esperado) {
        Write-Host ("OK      {0} (HTTP {1})" -f $nome, $resp.Status) -ForegroundColor Green
        $script:ok++
    } else {
        Write-Host ("FALHOU  {0}: esperado {1}, veio {2}" -f $nome, $esperado, $resp.Status) -ForegroundColor Red
        $script:falhas++
    }
}

$rnd = Get-Random -Minimum 10000 -Maximum 99999
$cpf = "{0}{1}" -f $rnd, (Get-Random -Minimum 100000 -Maximum 999999)
Write-Host "Testando $Base ..." -ForegroundColor Cyan

# ---- Cliente (CRUD completo) ----
$r = Chamar POST "/clientes" @{ nome = "Cliente Teste"; cpf = $cpf; telefone = "(45) 99999-0000"; email = "teste@email.com" }
Conferir "POST /clientes" $r 201
$cid = $r.Json.id
Conferir "POST /clientes com CPF repetido (regra 1)" (Chamar POST "/clientes" @{ nome = "Outro"; cpf = $cpf }) 400
Conferir "POST /clientes sem nome (validacao)" (Chamar POST "/clientes" @{ cpf = "1" }) 400
Conferir "GET /clientes" (Chamar GET "/clientes") 200
Conferir "GET /clientes/{id}" (Chamar GET "/clientes/$cid") 200
Conferir "GET /clientes/999999 (nao existe)" (Chamar GET "/clientes/999999") 404
Conferir "PUT /clientes/{id}" (Chamar PUT "/clientes/$cid" @{ nome = "Cliente Teste 2"; telefone = "(45) 98888-0000"; email = "t2@email.com" }) 200

# ---- Tecnico (CRUD completo) ----
$r = Chamar POST "/tecnicos" @{ nome = "Vendedor Teste"; especialidade = "Seminovos"; telefone = "(45) 97777-0000" }
Conferir "POST /tecnicos" $r 201
$tid = $r.Json.id
Conferir "GET /tecnicos" (Chamar GET "/tecnicos") 200
Conferir "GET /tecnicos/{id}" (Chamar GET "/tecnicos/$tid") 200
Conferir "PUT /tecnicos/{id}" (Chamar PUT "/tecnicos/$tid" @{ nome = "Vendedor Teste 2"; especialidade = "SUVs"; telefone = "(45) 97777-1111" }) 200

# ---- Veiculo (CRUD completo) ----
$r = Chamar POST "/veiculos" @{ marca = "Honda"; modelo = "Civic $rnd"; ano = 2019; cor = "Prata"; quilometragem = 48200; quantidade = 1; preco = 112900.00 }
Conferir "POST /veiculos" $r 201
$vid = $r.Json.id
Conferir "POST /veiculos com ano invalido (validacao)" (Chamar POST "/veiculos" @{ marca = "Fiat"; modelo = "Argo"; ano = 1800; quantidade = 1 }) 400
Conferir "POST /veiculos sem quantidade (validacao)" (Chamar POST "/veiculos" @{ marca = "Fiat"; modelo = "Argo"; ano = 2020 }) 400
Conferir "GET /veiculos" (Chamar GET "/veiculos") 200
Conferir "GET /veiculos/{id}" (Chamar GET "/veiculos/$vid") 200
Conferir "GET /veiculos/999999 (nao existe)" (Chamar GET "/veiculos/999999") 404
Conferir "PUT /veiculos/{id}" (Chamar PUT "/veiculos/$vid" @{ marca = "Honda"; modelo = "Civic $rnd"; ano = 2019; cor = "Prata"; quilometragem = 50000; quantidade = 1; preco = 110000.00 }) 200

# ---- Ordem de servico ----
$corpo = @{ descricao = "Venda de Honda Civic"; prioridade = "ALTA"; tipo = "VENDA"; clienteId = $cid; veiculoId = $vid }
Conferir "POST /ordens com cliente inexistente (regra 2)" (Chamar POST "/ordens" @{ descricao = "x"; clienteId = 999999 }) 404
$r = Chamar POST "/ordens" $corpo
Conferir "POST /ordens (ABERTA)" $r 201
$oid = $r.Json.id
if ($r.Json.status -ne "ABERTA") { Write-Host "FALHOU  status inicial deveria ser ABERTA" -ForegroundColor Red; $script:falhas++ }
Conferir "POST /ordens com veiculo em OS ativa (regra 13)" (Chamar POST "/ordens" $corpo) 400
Conferir "GET /ordens" (Chamar GET "/ordens") 200
Conferir "GET /ordens?status=ABERTA" (Chamar GET "/ordens?status=ABERTA") 200
Conferir "GET /ordens/{id}" (Chamar GET "/ordens/$oid") 200
Conferir "GET /ordens/prioridade/ALTA" (Chamar GET "/ordens/prioridade/ALTA") 200
Conferir "GET /ordens/prioridade/XYZ (invalida)" (Chamar GET "/ordens/prioridade/XYZ") 400
Conferir "GET /ordens/cliente/{id}" (Chamar GET "/ordens/cliente/$cid") 200
Conferir "PUT /ordens/{id} (atualizar)" (Chamar PUT "/ordens/$oid" @{ descricao = "Venda com troca"; prioridade = "MEDIA"; tipo = "VENDA"; clienteId = $cid; veiculoId = $vid }) 200
Conferir "PUT /ordens/{id}/concluir sem tecnico (regra 6)" (Chamar PUT "/ordens/$oid/concluir?valor=100000") 400
Conferir "PUT /ordens/{id}/tecnico/{id} (regra 5)" (Chamar PUT "/ordens/$oid/tecnico/$tid") 200
Conferir "PUT /ordens/{id}/concluir com valor zero (regra 10)" (Chamar PUT "/ordens/$oid/concluir?valor=0") 400
Conferir "DELETE /clientes/{id} com OS (regra 9)" (Chamar DELETE "/clientes/$cid") 400
Conferir "DELETE /veiculos/{id} com OS (regra 12)" (Chamar DELETE "/veiculos/$vid") 400
Conferir "DELETE /tecnicos/{id} com OS (regra 15)" (Chamar DELETE "/tecnicos/$tid") 400
Conferir "PUT /ordens/{id}/concluir (regra 7)" (Chamar PUT "/ordens/$oid/concluir?valor=110000.00") 200
Conferir "PUT /ordens/{id}/cancelar em OS concluida (regra 4)" (Chamar PUT "/ordens/$oid/cancelar") 400
Conferir "PUT /ordens/{id} em OS concluida (regra 4)" (Chamar PUT "/ordens/$oid" $corpo) 400
Conferir "DELETE /ordens/{id} concluida (regra 14)" (Chamar DELETE "/ordens/$oid") 400

# regra 16: vendeu a ultima unidade, o veiculo sai da tabela e nao da mais para vender
Conferir "GET /veiculos/{id} apos vender a ultima unidade (excluido)" (Chamar GET "/veiculos/$vid") 404
Conferir "POST /ordens de veiculo que nao existe mais" (Chamar POST "/ordens" $corpo) 404
Conferir "POST /ordens sem veiculo (regra 18)" (Chamar POST "/ordens" @{ descricao = "Venda"; prioridade = "ALTA"; tipo = "VENDA"; clienteId = $cid }) 400

# segunda OS em outro veiculo: cancelar (regra 8) e excluir
$r = Chamar POST "/veiculos" @{ marca = "Fiat"; modelo = "Argo $rnd"; ano = 2020; quantidade = 1 }
$v3 = $r.Json.id
$corpo2 = @{ descricao = "Venda de Fiat Argo"; prioridade = "ALTA"; tipo = "VENDA"; clienteId = $cid; veiculoId = $v3 }
$r = Chamar POST "/ordens" $corpo2
Conferir "POST /ordens (2a OS)" $r 201
$oid2 = $r.Json.id
Conferir "POST /ordens sem unidade livre (regra 13)" (Chamar POST "/ordens" $corpo2) 400
Conferir "PUT /ordens/{id}/cancelar (regra 8)" (Chamar PUT "/ordens/$oid2/cancelar") 200
Conferir "DELETE /ordens/{id} cancelada" (Chamar DELETE "/ordens/$oid2") 204
Conferir "GET /ordens/{id} apos excluir" (Chamar GET "/ordens/$oid2") 404
Conferir "DELETE /veiculos/{id} sem negociacao ativa" (Chamar DELETE "/veiculos/$v3") 204

# ---- Limpeza dos cadastros de teste que podem ser excluidos ----
# (cliente e tecnico ficam presos a OS concluida, por causa das regras 9 e 15)
$r = Chamar POST "/veiculos" @{ marca = "Kia"; modelo = "Sportage"; ano = 2022; quantidade = 1 }
$v2 = $r.Json.id
Conferir "DELETE /veiculos/{id} sem negociacao" (Chamar DELETE "/veiculos/$v2") 204
$r = Chamar POST "/tecnicos" @{ nome = "Temporario" }
$t2 = $r.Json.id
Conferir "DELETE /tecnicos/{id} sem OS" (Chamar DELETE "/tecnicos/$t2") 204
$r = Chamar POST "/clientes" @{ nome = "Temporario"; cpf = ("9{0}" -f (Get-Random -Minimum 1000000000 -Maximum 9999999999)) }
$c2 = $r.Json.id
Conferir "DELETE /clientes/{id} sem OS" (Chamar DELETE "/clientes/$c2") 204

Write-Host ""
if ($script:falhas -eq 0) {
    Write-Host ("TUDO CERTO: {0} verificacoes passaram." -f $script:ok) -ForegroundColor Green
} else {
    Write-Host ("{0} OK, {1} FALHARAM. Veja as linhas em vermelho." -f $script:ok, $script:falhas) -ForegroundColor Red
}
