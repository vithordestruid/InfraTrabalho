#!/usr/bin/env bash
# Gera /tmp/ordemservico-backup-DATA.tar.gz na EC2 (banco, Nginx, unit systemd, front, env sem segredo).
# Depois copie o arquivo para FORA da EC2 com scp (GUIA.md, R12).
set -euo pipefail
DATA=$(date +%Y%m%d-%H%M%S)
TMP=$(mktemp -d)
PAC="$TMP/ordemservico-backup"
mkdir -p "$PAC"

# Dump logico e consistente do PostgreSQL (nao copiar arquivos do banco com ele em uso)
sudo -u postgres pg_dump -d ordemservicodb --no-owner --clean --if-exists > "$PAC/ordemservicodb.sql"

cp /etc/nginx/sites-available/ordemservico "$PAC/nginx-ordemservico.conf"
cp /etc/systemd/system/ordemservico.service "$PAC/ordemservico.service"
cp -r /var/www/ordemservico "$PAC/front"
# Variaveis de ambiente SEM a senha
sudo sed 's/^\(SPRING_DATASOURCE_PASSWORD=\).*/\1VALOR_OCULTADO/' /etc/ordemservico/ordemservico.env > "$PAC/ordemservico.env.sanitizado"
cat > "$PAC/LEIA-ME.txt" <<TXT
Restauracao: 1) instalar pacotes e rodar instalar.sh; 2) psql -d ordemservicodb < ordemservicodb.sql;
3) restaurar nginx-ordemservico.conf e ordemservico.service; 4) preencher a senha real no .env.
O JAR vem do codigo-fonte (Git). Este pacote guarda dados e configuracao.
TXT

tar czf "/tmp/ordemservico-backup-$DATA.tar.gz" -C "$TMP" ordemservico-backup
rm -rf "$TMP"
echo "Backup criado: /tmp/ordemservico-backup-$DATA.tar.gz"
