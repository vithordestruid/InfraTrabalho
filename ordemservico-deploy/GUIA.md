# Sistema de Ordem de Serviço (Cell Point) na AWS: passo a passo

Arquitetura que vamos montar na EC2:

```
Navegador -> Security Group (22, 80, 443) -> Nginx (porta 80)
                                              |-- /                                  front estático (/var/www/ordemservico)
                                              |-- /clientes /tecnicos /veiculos /ordens
                                                     proxy_pass -> 127.0.0.1:8080  (Spring Boot, serviço systemd)
                                                                          |-> PostgreSQL (127.0.0.1:5432)
Administração: SSH (porta 22) só do IP do grupo
```

Mapa do sistema para a banca: o front chama "Vendedores" de `/tecnicos`, "Negociações" de `/ordens` e "Estoque" de `/veiculos`.

Funcionalidades para demonstrar no R01 (use as duas):
1. **Cadastrar cliente** e **vendedor**, depois **abrir uma negociação** (venda) para aquele cliente.
2. **Concluir a negociação** (precisa de vendedor atribuído) e ver o painel/estoque atualizarem.

Tudo com dados fictícios. Não use CPF nem nome de pessoa real.

## Conteúdo da pasta `ordemservico-deploy`

```
instalar.sh                  instala e configura tudo na EC2
ordemservico.service         unidade systemd do Spring Boot
nginx-ordemservico.conf      site do Nginx (estático + proxy_pass)
backup.sh                    gera o pacote de backup
teste_concorrencia.sh        5 requisições simultâneas (rodar no seu PC)
front/                       cópia do front (HTML/CSS/JS) do projeto
app.jar                      NÃO está aqui: você gera no seu PC (Etapa 3)
```

## Cronograma para terminar até amanhã

Hoje: etapas 1 a 4 (conta, EC2, SSH, deploy no ar) e depois a 5 (reboot). À noite ou amanhã cedo: 6 a 10 (segurança, logs, incidente, backup, concorrência). Amanhã antes de apresentar: etapa 11 (ensaio e conferência). Faça os prints **enquanto executa**, não depois.

---

## Etapa 1: conta AWS e créditos (R02)

1. Um integrante cria a conta em https://aws.amazon.com/pt/free/ com o **e-mail institucional da FAG**, escolhendo **Free Plan**.
2. No console, canto superior direito, abra o projeto/Billing e ache **Free plan status**.
3. **Evidência:** print com Free Plan, *Credits remaining* e *Days remaining*, ocultando nome e e-mail. Anote a data.
4. Tire mais prints do saldo depois de criar a EC2 e antes de apresentar. Monte uma tabelinha: data, saldo, recursos criados.
5. Os outros integrantes **não recebem a senha da conta**. Eles entram só por SSH (Etapa 3).

## Etapa 2: criar a EC2 (R03, R04)

**EC2 > Instances > Launch instances**:

| Campo | Valor |
|---|---|
| Name | `ordemservico-grupo-XX` |
| AMI | Ubuntu Server LTS (a mais recente marcada Free tier eligible) |
| Instance type | o **maior tipo elegível ao Free Plan** que o console mostrar. Spring Boot + PostgreSQL pedem pelo menos 1 GiB de RAM, e com 2 GiB a máquina fica bem mais folgada |
| Key pair | criar novo (.pem). **A chave privada fica só no seu PC**, nunca no grupo nem no Git |
| Network | VPC padrão, subnet pública, Auto-assign public IP: enable |
| Storage | 10 a 12 GiB gp3 (Java + PostgreSQL ocupam mais que um site estático) |

**Security Group** novo (`sg-ordemservico`):

| Porta | Origem | Motivo |
|---|---|---|
| TCP 22 | **Meu IP** (/32), nunca 0.0.0.0/0 | SSH de administração |
| TCP 80 | 0.0.0.0/0 | visitantes e avaliador |
| TCP 443 | 0.0.0.0/0 | só se fizer HTTPS (Etapa 6) |

As portas 8080 (Spring Boot) e 5432 (PostgreSQL) **não** são abertas: os dois escutam só em localhost.

Espere `running` e status checks 2/2. Anote ID da instância, região e IP público.

**Evidência R03:** print da instância e, por SSH, `hostnamectl`, `uname -a`, `free -h`, `df -h` com a interpretação de cada um.
**Evidência R04:** print das regras de entrada e a explicação de cada porta e origem.

## Etapa 3: SSH, build do JAR e envio (R05)

### 3.1 Acessar por SSH

PowerShell (Windows) ou terminal Linux/macOS:

```
ssh -i C:\chaves\ordemservico.pem ubuntu@IP_PUBLICO
```

No Windows, se der erro de "permissões muito abertas" na chave, restrinja o arquivo ao seu usuário (Propriedades > Segurança > Avançado, remover herança e deixar só você). No Linux/macOS: `chmod 400 ~/chaves/ordemservico.pem`.

Primeiros comandos na EC2: `whoami`, `hostnamectl`, `uname -a`, `ip -br address`, `free -h`, `df -h`, `sudo apt update && sudo apt upgrade -y`.

### 3.2 Gerar o JAR no seu computador

Na raiz do projeto (onde fica o `pom.xml`):

```
mvn -DskipTests package
```

O arquivo sai em `target\sistema-ordem-servico-0.0.1-SNAPSHOT.jar`. Compilar no seu PC e não na EC2 evita estourar a memória da máquina pequena.

### 3.3 Enviar para a EC2

Do seu PC (PowerShell), colocando a pasta `ordemservico-deploy` onde você quiser:

```
scp -i C:\chaves\ordemservico.pem -r ordemservico-deploy ubuntu@IP_PUBLICO:~/
scp -i C:\chaves\ordemservico.pem target\sistema-ordem-servico-0.0.1-SNAPSHOT.jar ubuntu@IP_PUBLICO:~/ordemservico-deploy/app.jar
```

### 3.4 Usuários dos outros integrantes (sem compartilhar chave)

Cada integrante gera a chave **no computador dele** (`ssh-keygen -t ed25519`) e manda só o conteúdo do `.pub`. Na EC2, para cada colega (troque `colega1`):

```
sudo adduser colega1
sudo mkdir -p /home/colega1/.ssh
sudo chmod 700 /home/colega1/.ssh
sudo nano /home/colega1/.ssh/authorized_keys     # colar só a chave PÚBLICA
sudo chown -R colega1:colega1 /home/colega1/.ssh
sudo chmod 600 /home/colega1/.ssh/authorized_keys
```

Teste o login do colega **em outro terminal** antes de qualquer outra mudança. Se ele estiver em outra rede, adicione o IP dele (/32) à regra 22 do Security Group. `sudo` só para quem precisa: `sudo usermod -aG sudo colega1`.

**Evidência R05:** `whoami`, `id`, `ls -l /home`, print do login de um colega, e a explicação: sem login root, um usuário e uma chave por integrante, chave privada só com o dono.

## Etapa 4: instalar o sistema (R06, R07)

Na EC2:

```
cd ~/ordemservico-deploy
bash instalar.sh
```

O script instala Nginx, PostgreSQL e Java 17, cria 1 GiB de swap, cria o usuário `ordemservico` (sem login), cria o banco com **senha aleatória guardada em `/etc/ordemservico/ordemservico.env`** (fora do repositório, permissão 640), instala o JAR, o front e o site do Nginx (remove o site padrão), roda `nginx -t`, habilita tudo no systemd e testa. O Spring Boot leva de 30 s a 2 min para subir numa máquina pequena.

Confira:

```
sudo systemctl status ordemservico --no-pager
sudo nginx -t
sudo ss -lntp
curl -s http://127.0.0.1:8080/clientes
curl -sI http://127.0.0.1/
```

No `ss -lntp` o esperado é: 80 em todas as interfaces (Nginx), e 8080 e 5432 só em 127.0.0.1.

Teste de **outro dispositivo/rede** (celular no 4G): abra `http://IP_PUBLICO/`, cadastre cliente e vendedor, abra e conclua uma negociação.

**Evidência R06/R07:** caminhos (`/opt/ordemservico`, `/var/www/ordemservico`, `/etc/ordemservico`), versão do JAR, print das funcionalidades, `sudo nginx -t`, `systemctl status nginx`, o arquivo `/etc/nginx/sites-available/ordemservico`, e o que acontece com o site se o backend parar (Etapa 8).

Para explicar o Nginx: `root` entrega o front direto do disco; o `location` com expressão regular encaminha `/clientes`, `/tecnicos`, `/veiculos` e `/ordens` ao Spring Boot via `proxy_pass`; o backend não precisa de porta pública porque só o Nginx fala com ele.

## Etapa 5: reinício automático (R08)

```
systemctl is-enabled nginx postgresql ordemservico
sudo reboot
```

A conexão cai. **Espere cerca de 2 minutos** (o Spring Boot demora a subir), reconecte e rode:

```
systemctl is-active nginx postgresql ordemservico
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/clientes
```

Abra a URL no navegador sem ter iniciado nada manualmente. Anote data, hora e resultado.

Para explicar: `enable` liga na inicialização e `start` inicia agora (`enable --now` faz os dois); `Restart=on-failure` reinicia o processo se ele cair, mas não resolve falha da máquina; reiniciar o SO é diferente de parar e iniciar a instância no console (stop/start), porque nesse caso o **IP público muda**. Por isso **não dê stop/start na instância antes da apresentação**.

## Etapa 6: segurança e HTTPS (R09)

```
sudo apt update && sudo apt upgrade -y
sudo ss -lntp
sudo ls -l /etc/ordemservico/
sudo ufw status verbose
```

Pontos para o relatório: pacotes atualizados; SSH só do IP do grupo; sem login root; Spring Boot e PostgreSQL só em 127.0.0.1; senha do banco aleatória em arquivo 640 fora do código; serviço roda com usuário sem privilégios e com `NoNewPrivileges`, `ProtectSystem=strict` e `ProtectHome`. O `application.properties` do projeto tem a senha de desenvolvimento local (`123`), que **não é usada na EC2** porque as variáveis de ambiente a substituem. Não projete o conteúdo do `.env` na apresentação.

Se usar UFW, libere o SSH **antes** de habilitar: `sudo ufw allow 22/tcp`, `sudo ufw allow 80/tcp`, `sudo ufw allow 443/tcp`, e só então `sudo ufw enable`. Confirme o SSH numa segunda sessão.

**HTTPS** exige um nome DNS. Opção gratuita: subdomínio em duckdns.org apontando para o IP público atual. Depois:

```
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx
sudo certbot renew --dry-run
```

Se não der tempo ou não funcionar, o PDF aceita documentar a limitação: o que tentou, o erro e o motivo concreto. Sem HTTPS, não digite dados reais no sistema. Para explicar: HTTP trafega em texto puro; HTTPS cifra com TLS e o certificado prova a identidade do servidor.

## Etapa 7: logs e monitoramento (R10)

```
free -h
df -h
top                                   # sair com q
ps aux --sort=-%mem | head
sudo tail -n 30 /var/log/nginx/access.log
sudo tail -n 30 /var/log/nginx/error.log
sudo journalctl -u ordemservico -n 30 --no-pager
sudo journalctl -u nginx -n 30 --no-pager
```

**Teste obrigatório** (uma requisição normal e uma rota inexistente, e achar os registros):

```
curl -s -o /dev/null -w "%{http_code}\n" http://IP_PUBLICO/clientes
curl -s -o /dev/null -w "%{http_code}\n" http://IP_PUBLICO/pagina-que-nao-existe
curl -s -w "\n%{http_code}\n" http://IP_PUBLICO/clientes/99999
sudo tail -n 6 /var/log/nginx/access.log
sudo tail -n 3 /var/log/nginx/error.log
```

Duas rotas inexistentes, dois 404 diferentes: `/pagina-que-nao-existe` é respondida pelo **próprio Nginx** (não tem arquivo, e aparece também no `error.log`); `/clientes/99999` é encaminhada e o **Spring Boot** responde 404 em JSON ("não encontrado"). Interprete pelo menos uma linha do log, por exemplo: `"GET /clientes/99999 HTTP/1.1" 404` significa que o Nginx encaminhou e o backend disse que o cliente não existe.

Observação: o `top` e o `free -h` mostram o `java` como maior consumidor de memória. Isso é esperado e vale comentar.

## Etapa 8: incidente controlado (R11)

Sequência exigida: estado saudável, falha, efeito percebido, evidência em log, recuperação, verificação externa.

```
# 1. Saudável
curl -s -o /dev/null -w "%{http_code}\n" http://IP_PUBLICO/clientes          # 200
systemctl is-active ordemservico                                              # active

# 2. Falha
sudo systemctl stop ordemservico

# 3. Efeito percebido (de fora)
curl -i http://IP_PUBLICO/clientes                                            # 502 Bad Gateway
# no navegador o front abre (Nginx ativo), mas as listas dão erro

# 4. Diagnóstico
systemctl status ordemservico --no-pager                                      # inactive (dead)
sudo ss -lntp | grep 8080                                                     # nada escutando
sudo tail -n 5 /var/log/nginx/error.log                                       # connect() failed (111: Connection refused) while connecting to upstream

# 5. Recuperação
sudo systemctl start ordemservico

# 6. Verificação externa (leva de 30 s a 2 min para o Spring Boot subir)
curl -i http://IP_PUBLICO/clientes                                            # volta 200
```

Atenção: logo depois do `start`, o `curl` ainda pode dar 502 por alguns segundos, porque o Spring Boot demora a subir. Isso é normal, mostra o `journalctl -u ordemservico -f` até aparecer `Started SistemaOrdemServicoApplication` e repita o teste. Dá para explicar como diferença entre "processo iniciado" e "pronto para atender".

Explicação para a banca: o Nginx continua ativo e serve o front, mas não obtém resposta do upstream (o Spring Boot), por isso **502** e não 404. Não apague nada, não derrube o PostgreSQL, não mexa em serviço de outros.

## Etapa 9: backup e restauração (R12)

Na EC2:

```
bash ~/ordemservico-deploy/backup.sh
```

Gera `/tmp/ordemservico-backup-DATA.tar.gz` com: dump do PostgreSQL (feito com `pg_dump`, consistente, não cópia crua dos arquivos do banco), configuração do Nginx, unit do systemd, front e o `.env` **sem a senha**.

No seu computador, copie para **fora da EC2**:

```
scp -i C:\chaves\ordemservico.pem ubuntu@IP_PUBLICO:/tmp/ordemservico-backup-*.tar.gz .\backup\
```

**Teste de restauração** (seguro, sem tocar nos dados em uso):

```
# na EC2: extrair uma cópia do backup e restaurar num banco de teste
mkdir -p ~/teste-restauracao && cd ~/teste-restauracao
tar xzf /tmp/ordemservico-backup-*.tar.gz
sudo -u postgres createdb ordemservicodb_teste
sudo -u postgres psql -d ordemservicodb_teste -f ordemservico-backup/ordemservicodb.sql
sudo -u postgres psql -d ordemservicodb_teste -c "SELECT id, nome FROM clientes;"
```

(As tabelas são `clientes`, `tecnicos`, `veiculos` e `ordens_servico`; liste com `\dt` se quiser.) Mostre que os clientes que você cadastrou aparecem no banco restaurado. Para mostrar a restauração de configuração, apague uma **cópia de teste** do site do Nginx e restaure do pacote:

```
sudo cp /etc/nginx/sites-available/ordemservico /tmp/ordemservico.bak
sudo cp ordemservico-backup/nginx-ordemservico.conf /tmp/nginx-restaurado.conf
diff /tmp/ordemservico.bak /tmp/nginx-restaurado.conf && echo "configuracao restaurada identica"
```

Limpeza: `sudo -u postgres dropdb ordemservicodb_teste`.

Diferença para explicar: o Git guarda o **código**; o backup guarda os **dados** do PostgreSQL e a configuração do servidor, em outro lugar que não a EC2.

## Etapa 10: teste leve de concorrência (R13)

No seu computador (Git Bash, WSL, Linux ou macOS):

```
bash teste_concorrencia.sh http://IP_PUBLICO
```

Dispara 5 requisições simultâneas ao front e 5 à API. Anote códigos (todos 200) e tempos. Depois mostre as linhas novas no `access.log` da EC2. No PowerShell puro, alternativa: abra a URL em 5 abas/dispositivos em intervalo curto e anote o resultado.

Análise: o Nginx recebe as conexões e as atende de forma assíncrona; o Tomcat do Spring Boot usa um pool de threads; cada chamada à API consulta o PostgreSQL. Possíveis gargalos: a RAM pequena (o Java é o maior consumidor), a CPU da instância e o banco. Para 5 requisições não há problema, e o teste não é de estresse.

## Etapa 11: encerramento e ensaio (R14)

1. Inventário: 1 EC2, 1 volume EBS, 1 Security Group, 1 key pair, IP público.
2. Confira o saldo de créditos e faça o print final.
3. **Ensaio completo** de outro dispositivo: abrir a URL, SSH, incidente, backup. Alguém confere URL e SSH **antes de começar** a apresentação.
4. Depois do período acadêmico: backup final para fora da EC2 e só então **Terminate** (apaga o volume; stop não apaga). Remova Security Group e key pair que não usar mais.

## Relatório técnico (8 a 15 páginas)

1. Identificação (sistema de ordem de serviço Cell Point, integrantes, finalidade, funcionalidades implantadas)
2. Tecnologias (Java 17, Spring Boot, PostgreSQL, Nginx, systemd, Ubuntu Server)
3. Arquitetura (o diagrama do início)
4. Provisionamento (região, AMI, tipo, disco, rede, créditos)
5. Administração (usuários SSH, chaves, permissões, serviços)
6. Publicação (passos, config do Nginx, caminhos)
7. Segurança (portas, atualização, segredos, HTTPS ou justificativa)
8. Operação (inicialização automática, logs, métricas, reboot)
9. Testes (externo, concorrência, incidente, restauração)
10. Continuidade (backup, falha, recursos ativos, encerramento)

Para **cada teste**: objetivo, comando, resultado e interpretação. Todo print com legenda. Nunca inclua `.pem`, senha, `.env` real ou dados pessoais. Como o professor liberou usar um sistema diferente do PROEX, registre em uma linha: "conforme orientação do professor, foi implantado o sistema de ordem de serviço".

## Respostas curtas para as perguntas da banca (seção 15 do PDF)

1. **EC2, Ubuntu e Nginx:** EC2 é a máquina virtual na nuvem; Ubuntu é o sistema operacional dela; Nginx é o programa que atende HTTP dentro do Ubuntu.
2. **Caminho da requisição:** navegador, Internet, Security Group (porta 80), Nginx, e então arquivo estático ou `proxy_pass` ao Spring Boot em 127.0.0.1:8080, que consulta o PostgreSQL e responde pelo mesmo caminho.
3. **IP público e privado:** o público é alcançável da Internet e muda em stop/start; o privado vale só dentro da VPC.
4. **SSH restrito:** é acesso administrativo; aberto ao mundo vira alvo de tentativas de invasão.
5. **Portas 22, 80, 443:** SSH, HTTP e HTTPS. As do Spring Boot (8080) e do banco (5432) escutam só em localhost, então não precisam de regra pública.
6. **Estático x proxy reverso:** no estático o Nginx lê o arquivo e entrega; no proxy reverso ele repassa a requisição a outro processo e devolve a resposta. Aqui usamos os dois.
7. **Processo no SSH x systemd:** o processo do terminal morre ao fechar a sessão ou reiniciar a máquina; o serviço do systemd sobe sozinho e reinicia em falha.
8. **Reboot x stop/start:** reboot reinicia o SO e mantém o IP; stop/start desliga e liga a instância, e o IP público costuma mudar.
9. **502 com Nginx ativo:** o Nginx funciona, mas o backend (upstream) não respondeu.
10. **Log de acesso:** `/var/log/nginx/access.log` registra IP, hora, rota e código; ajuda a ligar um teste ao evento e achar erros.
11. **Segredos:** senha do banco aleatória em arquivo 640 fora do código, serviço com usuário sem privilégios, chave privada só no PC do titular.
12. **Git x backup:** Git guarda código; backup guarda os dados do banco e a configuração, fora da instância.
13. **Crédito acabando:** os recursos ficam inacessíveis ao fim do saldo ou do prazo. Evitar: dimensionar pequeno, acompanhar o painel, fazer backup externo **antes** de encerrar.
14. **Limites de uma EC2:** sem alta disponibilidade. Se a máquina, a zona ou o disco falharem, a aplicação cai; exigiria múltiplas instâncias, balanceador e banco gerenciado.

## Se algo der errado

| Sintoma | Primeira verificação |
|---|---|
| SSH sem resposta | IP público certo? regra 22 com o seu IP atual? instância `running`? |
| Página padrão do Nginx | `ls /etc/nginx/sites-enabled/` (o `default` deve estar removido) e `sudo nginx -t` |
| 502 logo após instalar ou reiniciar | o Spring Boot ainda está subindo: `sudo journalctl -u ordemservico -f` |
| 502 e o serviço não sobe | `journalctl -u ordemservico -n 50 --no-pager`: erro de senha do banco, falta de memória (confira `free -h` e `swapon --show`) ou versão do Java |
| `Out of memory` / máquina trava | confirme o swap e use um tipo de instância com mais RAM, se o Free Plan permitir |
| Front abre mas listas vazias com erro | `curl -i http://127.0.0.1:8080/clientes` na EC2 para separar problema do Nginx de problema do backend |
| Site caiu depois de stop/start | o IP público mudou: confira no console e atualize DNS, se houver |
