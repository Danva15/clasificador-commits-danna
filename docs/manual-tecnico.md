# Manual técnico

## 1. Arquitectura

El sistema está compuesto por un cliente HTTP, una API desarrollada con Node.js y Express, dos motores de clasificación y una base de datos PostgreSQL.

El flujo general de comunicación es:

Postman
   |
   v
API Node.js / Express (:3000)
   |
   +-- ECO
   |
   +-- Ollama (:11434)
   |      └── qwen2.5:0.5b
   |
   └-- PostgreSQL (:5432)

### Componentes

**Cliente:** se utiliza Postman para realizar solicitudes HTTP y comprobar el funcionamiento de los endpoints de la API.

**API Express:** aplicación desarrollada con Node.js y Express que recibe las solicitudes del cliente y coordina el proceso de clasificación, medición de latencia y almacenamiento de los resultados.

**Motor ECO:** motor de clasificación basado en reglas locales. Permite clasificar los mensajes sin utilizar un modelo de inteligencia artificial externo.

**Motor Ollama:** motor de inferencia local que utiliza Ollama y el modelo `qwen2.5:0.5b` para realizar la clasificación.

**PostgreSQL:** base de datos utilizada para almacenar información relacionada con los análisis e inferencias realizadas por la aplicación. Se ejecuta mediante Docker.

### Puertos

| Componente  |  Puerto | Función                                             |
| ----------- | ------: | --------------------------------------------------- |
| API Express |  `3000` | Recibir solicitudes HTTP del cliente                |
| PostgreSQL  |  `5432` | Comunicación entre la aplicación y la base de datos |
| Ollama      | `11434` | Comunicación con el motor de inferencia local       |

## 2. Seguridad

### Puertos expuestos

La API de Node.js y Express utiliza el puerto `3000` para recibir las solicitudes HTTP realizadas por el cliente.

PostgreSQL utiliza el puerto `5432` para permitir la conexión de la aplicación con la base de datos.

Ollama utiliza el puerto `11434` para que la API pueda comunicarse con el motor de inferencia local.


### Roles de la base de datos

La aplicación utiliza el usuario `app_user` para conectarse a PostgreSQL.

Este usuario se utiliza para realizar las operaciones necesarias sobre los datos de la aplicación. No se debería utilizar el usuario administrador de PostgreSQL para las operaciones normales de la API.

El usuario de la aplicación debe tener únicamente los permisos necesarios para trabajar con las tablas que utiliza el sistema.

### Manejo de secretos

Las credenciales utilizadas para conectarse a PostgreSQL se manejan mediante variables de entorno definidas en el archivo `.env`.

El archivo `.env` contiene información sensible, como la contraseña de la base de datos, por lo que no debe subirse al repositorio.

El archivo `.gitignore` se utiliza para evitar que `.env` sea agregado accidentalmente a Git.

El archivo `.env.example` sirve como referencia para indicar qué variables de entorno necesita el proyecto, sin incluir las contraseñas reales.

### Qué hacer si se filtra una contraseña

Si una contraseña de la base de datos se filtrara, se debería considerar comprometida y cambiarla inmediatamente.

El procedimiento sería:

1. Cambiar la contraseña comprometida.
2. Actualizar la variable correspondiente en `.env`.
3. Reiniciar los servicios que utilicen esa contraseña.
4. Revisar los registros para detectar accesos no autorizados.
5. Comprobar que la contraseña no haya quedado almacenada en el historial de Git.
6. Si la contraseña fue subida al repositorio, eliminarla del historial cuando sea necesario y generar una nueva.
7. Verificar que `.env` continúe incluido en `.gitignore`.

## 3. Respaldo y restauración

### Objetivo

El sistema utiliza PostgreSQL para almacenar los resultados de las clasificaciones realizadas por los motores ECO y Ollama. Para proteger estos datos se realiza un respaldo de la base de datos y se verifica periódicamente que dicho respaldo pueda ser restaurado correctamente.

Los respaldos se almacenan localmente en el directorio `backups/`. Este directorio está incluido en `.gitignore` para evitar que los archivos de respaldo, que pueden contener información de la base de datos, sean publicados en el repositorio.

### Creación del respaldo

El respaldo de la base de datos se realiza utilizando `pg_dump`:


mkdir -p backups

docker compose exec -T postgres \
  pg_dump -U app_user -d github_assistant \
  > backups/respaldo_$(date +%F).sql


### Verificación del respaldo

Después de crear el respaldo se verificó que el archivo hubiera sido generado correctamente:

ls -lh backups/

Durante la prueba se generó el archivo:

backups/respaldo_2026-08-19.sql
Prueba de restauración

Para comprobar que el respaldo podía recuperar realmente la información, primero se verificó la cantidad de registros existentes en la tabla analyses:

   docker compose exec -T postgres \
   psql -U app_user -d github_assistant \
   -c "SELECT COUNT(*) FROM analyses;"

   El resultado fue:

   count
   -------
      662

se simuló un desastre eliminando temporalmente los registros:

docker compose exec -T postgres \
  psql -U app_user -d github_assistant \
  -c "TRUNCATE analyses;"

Se comprobó que la tabla había quedado vacía:

   count
   -------
      0

Posteriormente se realizó la restauración utilizando el archivo de respaldo:

cat backups/respaldo_$(date +%F).sql | \
docker compose exec -T postgres \
psql -U app_user -d github_assistant

Durante la restauración PostgreSQL mostró algunos mensajes indicando que determinados objetos ya existían. Esto ocurrió porque el respaldo contenía instrucciones para reconstruir la estructura de la base de datos. A pesar de estos mensajes, los datos fueron restaurados correctamente.

Finalmente se volvió a consultar la cantidad de registros:

docker compose exec -T postgres \
  psql -U app_user -d github_assistant \
  -c "SELECT COUNT(*) FROM analyses;"

Resultado:

   count
   -------
      662

La prueba confirmó que los 662 registros existentes antes del desastre fueron recuperados correctamente.

Periodicidad propuesta

Se propone realizar respaldos:

Diariamente, para minimizar la pérdida de información.
Semanalmente, conservando copias durante un periodo mayor.
Realizar una prueba periódica de restauración para verificar que los respaldos continúan siendo válidos.

La frecuencia puede ajustarse según la cantidad de información generada por el sistema.

### Responsable

El responsable del procedimiento de respaldo y restauración es la persona encargada del mantenimiento del proyecto.

Sus responsabilidades son:

      1.Verificar que los respaldos se generen correctamente.
      2.Comprobar que los archivos tengan una fecha y tamaño adecuados.
      3.Mantener las copias en un lugar seguro.
      4.Realizar pruebas periódicas de restauración.
      5.Comprobar que los datos recuperados sean consistentes.

### Protección de los archivos de respaldo

Los archivos .sql pueden contener información almacenada en la base de datos, por lo que no deben publicarse en el repositorio.

El directorio backups/ está incluido en .gitignore:

backups/

De esta manera, los archivos de respaldo no se agregan accidentalmente al repositorio Git.

## 4. Endpoints

La API expone los siguientes endpoints para comprobar el estado del servicio, realizar clasificaciones y consultar los resultados almacenados en PostgreSQL.

### GET `/`

Comprueba que la API está funcionando.

**Respuesta exitosa:**

json
{
  "message": "GitHub Assistant API funcionando"
}  

Código HTTP: 200 OK.

### GET /health

Comprueba la disponibilidad de la API y su conexión con PostgreSQL.

Respuesta exitosa:

{
  "estado": "ok",
  "base_datos": "ok"
}

Código HTTP: 200 OK.

### POST /clasificar

Clasifica un texto utilizando uno de los dos motores disponibles: ECO u Ollama. El resultado se almacena en la tabla analyses.

Entrada:

   {
   "texto": "corregir error en la función de autenticación",
   "motor": "eco"
   }

El campo motor acepta los valores:

   1.eco
   2.ollama

Respuesta exitosa:

{
  "motor": "eco",
  "modelo": "reglas-v1",
  "entrada": "corregir error en la función de autenticación",
  "tipo": "fix",
  "latencia_ms": 0
}

Códigos:

   Código	Significado
   200	Clasificación realizada correctamente
   400	Falta el campo texto o el motor no es válido
   500	Error al procesar la clasificación o guardar el resultado

### GET /analyses

Consulta los análisis almacenados en PostgreSQL.

Entrada: no requiere parámetros.

Respuesta: devuelve un arreglo JSON con los registros almacenados en la tabla analyses.

Código HTTP: 200 OK.

Si ocurre un error al consultar PostgreSQL, la API responde con un error 500.

### GET /inferencias

Consulta los registros de inferencias almacenados en la base de datos.

Entrada: no requiere parámetros.

Respuesta: devuelve los registros disponibles.

Código HTTP: 200 OK.

Si ocurre un error durante la consulta, la API responde con un error 500.

### POST /analyses

Endpoint utilizado para registrar un análisis directamente.

Entrada:

   {
   "repository": "mi-repositorio",
   "commit_hash": "abc123",
   "summary": "Descripción del análisis",
   "risks": "Sin riesgos importantes",
   "suggestions": "Continuar con las pruebas"
   }

Código esperado: 201 Created.

Nota: este endpoint corresponde a una implementación anterior del esquema de analyses. La clasificación principal de la versión actual utiliza POST /clasificar, que almacena los campos motor, modelo, entrada, salida y latencia_ms.

### POST /test-ollama

Endpoint de prueba utilizado para comprobar la comunicación con el motor Ollama.

Se utiliza durante las pruebas de integración del motor de inferencia local.

Código esperado: 200 OK cuando la comunicación con Ollama funciona correctamente.

## 5. MODELO DE DATOS

La información de las clasificaciones realizadas por la API se almacena en la tabla `analyses` de PostgreSQL.

### Tabla `analyses`

| Campo | Tipo | Restricciones | Descripción |
| ----- | ---- | ------------- | ----------- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único del registro |
| `motor` | `VARCHAR(20)` | `NOT NULL` | Motor utilizado para realizar la clasificación (`eco` u `ollama`) |
| `modelo` | `VARCHAR(100)` | — | Nombre del modelo o versión del motor utilizado |
| `entrada` | `TEXT` | `NOT NULL` | Texto recibido para realizar la clasificación |
| `salida` | `VARCHAR(20)` | `NOT NULL` | Resultado de la clasificación |
| `latencia_ms` | `INTEGER` | — | Tiempo empleado para realizar la clasificación, expresado en milisegundos |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha y hora en que se almacenó el registro |

### Estructura SQL

La tabla utilizada por la aplicación se define de la siguiente manera:

sql
CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    motor VARCHAR(20) NOT NULL,
    modelo VARCHAR(100),
    entrada TEXT NOT NULL,
    salida VARCHAR(20) NOT NULL,
    latencia_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### Motores utilizados

La columna motor identifica el mecanismo utilizado para realizar la clasificación:

eco: utiliza el motor local basado en reglas reglas-v1. No requiere inferencia mediante un modelo de lenguaje.
ollama: utiliza Ollama con el modelo local qwen2.5:0.5b.

La columna latencia_ms permite comparar el costo de procesamiento de ambos motores. En las pruebas realizadas, el motor ECO presentó una latencia considerablemente menor que el motor Ollama debido a que no necesita realizar una inferencia mediante un modelo de lenguaje.

## 6. DECISION DE DISEÑO Y LIMITACIONES

### Dockerfile multi-etapa

Se utiliza un Dockerfile multi-etapa para separar la instalación y preparación de las dependencias de la ejecución final de la aplicación.

En la primera etapa se instalan las dependencias necesarias para construir la aplicación. En la etapa final solamente se incluyen los elementos necesarios para ejecutar el servicio.

Esta decisión permite reducir el tamaño de la imagen final y evitar incluir herramientas o archivos innecesarios en el contenedor de producción.

### Usuario sin privilegios

El contenedor de la API no ejecuta la aplicación como usuario `root`. Se utiliza un usuario sin privilegios para reducir el impacto de posibles vulnerabilidades de la aplicación.

De esta manera, si un proceso dentro del contenedor fuera comprometido, los permisos disponibles serían menores que los de un usuario administrador.

### Motor ECO

Se implementó el motor ECO como una alternativa de clasificación basada en reglas locales.

La principal ventaja es que no requiere realizar inferencias mediante un modelo de lenguaje, por lo que presenta una latencia muy baja y permite responder rápidamente ante mensajes que pueden clasificarse mediante reglas.

Además, permite disponer de un mecanismo de clasificación incluso cuando Ollama no está disponible.

### Motor Ollama

Ollama se utiliza como segundo motor de clasificación mediante el modelo local `qwen2.5:0.5b`.

Su principal ventaja es permitir realizar inferencias utilizando un modelo de lenguaje ejecutado localmente, sin depender de una API externa.

La desventaja principal es que la inferencia requiere considerablemente más tiempo que el motor ECO.

### Privilegios mínimos en PostgreSQL

La aplicación utiliza el usuario `app_user` para acceder a la base de datos.

La separación de usuarios permite evitar que la aplicación utilice directamente un usuario administrativo para sus operaciones normales.

También existe el usuario `api_user`, utilizado para operaciones con permisos más limitados. La asignación de privilegios busca aplicar el principio de mínimo privilegio, otorgando a cada usuario únicamente las capacidades necesarias.

Las operaciones administrativas de PostgreSQL deben realizarse mediante un usuario con los privilegios correspondientes y no desde la aplicación.

### Uso de Docker Compose

Docker Compose permite ejecutar conjuntamente los servicios de la aplicación y PostgreSQL.

La configuración facilita la creación de una red interna entre los contenedores y permite que la API se comunique con PostgreSQL mediante el nombre del servicio.

También se utiliza un volumen persistente para PostgreSQL, evitando que los datos desaparezcan cuando los contenedores son detenidos y creados nuevamente.

### Limitaciones conocidas

El sistema presenta las siguientes limitaciones:

1. **Dependencia de recursos locales:** el rendimiento de Ollama depende de los recursos disponibles en el equipo donde se ejecuta el modelo.

2. **Mayor latencia de Ollama:** las pruebas realizadas mostraron que el motor Ollama presenta una latencia significativamente mayor que ECO.

3. **Modelo pequeño:** el modelo `qwen2.5:0.5b` tiene recursos limitados frente a modelos de mayor tamaño, por lo que sus clasificaciones pueden ser menos precisas en casos complejos.

4. **Clasificación basada en reglas:** el motor ECO es rápido, pero solamente puede identificar correctamente los casos contemplados por sus reglas.

5. **Sin alta disponibilidad real:** aunque la aplicación puede recuperarse después de reiniciar un contenedor, la solución utiliza una única instancia de la API y una única instancia de PostgreSQL.

6. **Almacenamiento local:** los respaldos se generan localmente. Para un entorno de producción sería recomendable almacenar copias adicionales en una ubicación independiente.

7. **Sin autenticación de usuarios:** la API desarrollada para este proyecto no implementa un sistema de autenticación para controlar quién puede consumir los endpoints.

### Resultado de las pruebas de rendimiento

Las pruebas realizadas permitieron comparar el comportamiento de ambos motores.

El motor ECO fue sometido a una prueba de carga con hasta 10 usuarios virtuales. Se obtuvieron los siguientes resultados:

| Indicador | Resultado |
| --------- | --------- |
| Peticiones HTTP | 651 |
| Errores | 0.00 % |
| Latencia promedio | 19.85 ms |
| Latencia p95 | 26.15 ms |
| Máximo de usuarios virtuales | 10 |

El umbral establecido para la prueba era un `p95 < 800 ms` y una tasa de errores menor al `5 %`. Ambos objetivos fueron cumplidos.

Para Ollama se realizaron 10 inferencias secuenciales:

| Indicador | Resultado |
| --------- | --------- |
| Inferencias | 10 |
| Promedio | 4651 ms |
| Mediana | 4522 ms |
| p95 | 6044 ms |

Estos resultados muestran que ECO es considerablemente más rápido para solicitudes que puede resolver mediante reglas, mientras que Ollama requiere varios segundos debido al proceso de inferencia del modelo.