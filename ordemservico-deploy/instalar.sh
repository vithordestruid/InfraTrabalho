#!/usr/bin/env bash
# Instala o Sistema de Ordem de Servico na EC2 (Ubuntu Server 22.04, 24.04 ou 26.04).
# Antes: copiar esta pasta e o JAR para a EC2 (ver GUIA.md) e deixar o JAR aqui como app.jar.
#   cd ~/ordemservico-deploy && bash instalar.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f app.jar ] || { echo "ERRO: falta o app.jar nesta pasta (gere com 'mvn -DskipTests package' no seu PC e envie com scp)."; exit 1; }

echo "== Pacotes =="
sudo apt update
# Java: usa o 17 se existir no Ubuntu da instancia; senao 21, 25 ou o padrao (o JAR compilado para 17 roda nelas)
JAVA_PKG=""
for v in 17 21 25; do
  if apt-cache show "openjdk-${v}-jre-headless" >/dev/null 2>&1; then JAVA_PKG="openjdk-${v}-jre-headless"; break; fi
done
[ -n "$JAVA_PKG" ] || JAVA_PKG="default-jre-headless"
echo "Java escolhido: $JAVA_PKG"
sudo apt install -y nginx postgresql "$JAVA_PKG" curl openssl
java -version

echo "== Swap (a maquina pequena precisa, Java + PostgreSQL) =="
if [ -z "$(swapon --show --noheadings)" ]; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== Usuario do servico (sem login, nao e root) =="
id ordemservico >/dev/null 2>&1 || sudo useradd --system --home /opt/ordemservico --shell /usr/sbin/nologin ordemservico

echo "== Banco e segredos (senha aleatoria, fora do repositorio) =="
sudo mkdir -p /etc/ordemservico
if [ ! -f /etc/ordemservico/ordemservico.env ]; then
  DBPASS=$(openssl rand -hex 16)
  sudo -u postgres psql -v ON_ERROR_STOP=1 \
    -c "DO \$do\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='ordemservico') THEN CREATE ROLE ordemservico LOGIN; END IF; END \$do\$;" \
    -c "ALTER ROLE ordemservico PASSWORD '${DBPASS}';"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ordemservicodb'" | grep -q 1 \
    || sudo -u postgres createdb -O ordemservico ordemservicodb
  sudo tee /etc/ordemservico/ordemservico.env >/dev/null <<ENV
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/ordemservicodb
SPRING_DATASOURCE_USERNAME=ordemservico
SPRING_DATASOURCE_PASSWORD=${DBPASS}
SPRING_JPA_SHOW_SQL=false
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
ENV
  sudo chown root:ordemservico /etc/ordemservico/ordemservico.env
  sudo chmod 640 /etc/ordemservico/ordemservico.env
else
  echo "(arquivo de ambiente ja existe, mantido)"
fi

echo "== Backend =="
sudo mkdir -p /opt/ordemservico
sudo install -o root -g ordemservico -m 640 app.jar /opt/ordemservico/app.jar
sudo install -m 644 ordemservico.service /etc/systemd/system/ordemservico.service

echo "== Front-end estatico =="
sudo mkdir -p /var/www/ordemservico
sudo cp -r front/. /var/www/ordemservico/
sudo chmod -R a+rX /var/www/ordemservico

echo "== Nginx: site proprio, remove o padrao =="
sudo install -m 644 nginx-ordemservico.conf /etc/nginx/sites-available/ordemservico
sudo ln -sf /etc/nginx/sites-available/ordemservico /etc/nginx/sites-enabled/ordemservico
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

echo "== Inicializacao automatica =="
sudo systemctl daemon-reload
sudo systemctl enable --now postgresql
sudo systemctl enable --now nginx
sudo systemctl enable --now ordemservico
sudo systemctl reload nginx

echo "== Aguardando o Spring Boot subir (pode levar ate 1-2 min) =="
for i in $(seq 1 45); do
  if curl -fs http://127.0.0.1:8080/clientes >/dev/null 2>&1; then echo "backend respondendo"; break; fi
  sleep 3
done

echo "--- Testes locais ---"
curl -s -o /dev/null -w "front  via Nginx : HTTP %{http_code}\n" http://127.0.0.1/
curl -s -o /dev/null -w "API    via Nginx : HTTP %{http_code}\n" http://127.0.0.1/clientes
sudo ss -lntp | grep -E ':(80|8080|5432) ' || true
echo "Pronto. Abra http://IP_PUBLICO/ no navegador."
