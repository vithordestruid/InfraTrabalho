#!/usr/bin/env bash
# Teste leve (5 requisicoes simultaneas). Rodar no SEU computador (Git Bash, WSL, Linux ou macOS):
#   bash teste_concorrencia.sh http://IP_PUBLICO
URL="${1:?informe a URL, ex: http://IP_PUBLICO}"
URL="${URL%/}"
echo "Pagina inicial (Nginx):"
for i in 1 2 3 4 5; do
  curl --max-time 10 -s -o /dev/null -w "requisicao ${i}: HTTP %{http_code} em %{time_total}s\n" "$URL/" &
done
wait
echo "API de leitura (Nginx -> Spring Boot -> PostgreSQL):"
for i in 1 2 3 4 5; do
  curl --max-time 10 -s -o /dev/null -w "requisicao ${i}: HTTP %{http_code} em %{time_total}s\n" "$URL/clientes" &
done
wait
