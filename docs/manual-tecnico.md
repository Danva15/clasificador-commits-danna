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
