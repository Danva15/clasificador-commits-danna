#!/bin/bash
# diagnostico.sh - Reporte del estado del entorno

echo "=== SISTEMA ==="
uname -a

echo
echo "=== MEMORIA ==="
free -h

echo
echo "=== DISCO ==="
df -h /

echo
echo "=== VERSIONES ==="
git --version || echo "git NO instalado"
python3 --version || echo "python3 NO instalado"
docker --version || echo "docker NO instalado"
docker compose version || echo "compose NO instalado"
command -v ollama >/dev/null 2>&1 && ollama --version || echo "ollama NO instalado"

echo
echo "=== SERVICIOS ==="
systemctl is-active docker || echo "docker inactivo"

echo
echo "=== CONTENEDORES ==="
docker ps -a 2>/dev/null || true

echo
echo "=== MODELOS ==="
ollama list 2>/dev/null || true
