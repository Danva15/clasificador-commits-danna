# CLASIFICADOR_COMMITS_DANNA

# Clasificador de Commits de Git con IA Local

Servicio desarrollado con Node.js y Express que recibe el texto de un commit de Git y determina su categoría (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`) utilizando un motor por reglas (ECO) o un modelo de IA local mediante Ollama (`qwen2.5:0.5b`).
------------------------------------------------------------------------------------

## Integrante y perfil de hardware

- Desarrolladora: Danna Valentina
- Entorno: Linux Ubuntu
- Docker y Docker Compose
- Ollama ejecutándose localmente
------------------------------------------------------------------------------------
## Requisitos previos

- Linux
- Docker Engine
- Docker Compose Plugin
- Node.js y npm
- Ollama
- Modelo `qwen2.5:0.5b`
------------------------------------------------------------------------------------
## Instalación y despliegue

### 1. Clonar el repositorio

```bash
git clone git@github.com:USUARIO/clasificador-commits-danna.git
cd clasificador-commits-danna
```
### 2. Configurar variables de entorno
cp .env.example .env

Editar .env con las credenciales correspondientes.

### 3. Descargar el modelo de Ollama
ollama pull qwen2.5:0.5b

### 4. Levantar los servicios
docker compose up -d --build

### Verificar:

docker compose ps

## Verificación

### Estado de la API
curl http://localhost:3000/health

Debe responder:

{"estado":"ok","base_datos":"ok"}

## Clasificación con ECO
curl -X POST http://localhost:3000/clasificar \
  -H "Content-Type: application/json" \
  -d '{"texto":"corregir error en la función de autenticación","motor":"eco"}'

## Clasificación con Ollama
curl -X POST http://localhost:3000/clasificar \
  -H "Content-Type: application/json" \
  -d '{"texto":"agregar endpoint de historial","motor":"ollama"}'

## Consultar análisis almacenados
curl http://localhost:3000/analyses

### Solución de problemas frecuentes

 1.La API no conecta con PostgreSQL: verificar que los contenedores estén activos con docker compose ps.
 2.El modelo Ollama no responde: verificar que Ollama esté ejecutándose y que qwen2.5:0.5b esté instalado.
 3.Error de permisos en PostgreSQL: comprobar los privilegios de app_user sobre la tabla analyses.
 4. El puerto 3000 está ocupado: detener el proceso que utiliza el puerto o modificar el mapeo en compose.yaml.
 5.Los cambios del código no aparecen en Docker: reconstruir la imagen con docker 
 
 compose up -d --build.

## Documentación

La documentación técnica completa se encuentra en:

docs/manual-tecnico.md — arquitectura, seguridad, endpoints, modelo de datos y respaldo.
docs/informe-tecnico.md — pruebas funcionales, disponibilidad, persistencia, carga y caracterización del modelo.
Licencia

Proyecto académico desarrollado para la actividad de formación.