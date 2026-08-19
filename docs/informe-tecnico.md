# Informe técnico - GitHub Assistant

## 1. Descripción

El proyecto GitHub Assistant es una API desarrollada con Node.js y Express que permite clasificar textos relacionados con commits utilizando dos motores de clasificación:

- ECO: clasificación basada en reglas.
- Ollama: clasificación mediante el modelo `qwen2.5:0.5b`.

La aplicación utiliza PostgreSQL como sistema de persistencia y Docker para la contenerización de los servicios.

La API expone el endpoint `/clasificar` para realizar las clasificaciones y almacena los resultados en la tabla `analyses`.

---

## 2. Plan de pruebas

Se realizaron pruebas funcionales, de seguridad, conectividad, disponibilidad, persistencia, carga y caracterización de latencia.


| ID | Tipo | Prueba | Estado |
|:---:|:---|:---|:---:|
| P-01 | Funcional | `GET /health` | ✅ Aprobada |
| P-02 | Funcional | `POST /clasificar` con ECO | ✅ Aprobada |
| P-03 | Funcional | Motor inválido | ✅ Aprobada |
| P-04 | Acceso | Restricciones de `api_user` | ✅ Aprobada |
| P-05 | Conectividad | Conexión API → PostgreSQL | ✅ Aprobada |
| P-06 | Disponibilidad | Reinicio de PostgreSQL | ✅ Aprobada |
| P-07 | Persistencia | `down` + `up` conservan datos | ✅ Aprobada |
| P-08 | Carga | 10 VUs sobre ECO | ✅ Aprobada |
| P-09 | Caracterización | 10 inferencias con Ollama | ✅ Aprobada |

---


## 3. Resultados de la prueba de carga

La prueba de carga del motor ECO se realizó mediante k6 utilizando hasta 10 usuarios virtuales.

Los resultados obtenidos fueron:

| ID   | Resultado obtenido |
|:----:|:-------------------|
| P-01 | HTTP 200 — `estado: ok`, `base_datos: ok` |
| P-02 | HTTP 200 — clasificación `fix` |
| P-03 | HTTP 400 para motor diferente de `eco` u `ollama` |
| P-04 | `permission denied for table analyses` |
| P-05 | API conectada correctamente con PostgreSQL |
| P-06 | `/health` volvió a responder correctamente después del reinicio |
| P-07 | Los servicios volvieron a levantarse correctamente y el volumen persistió |
| P-08 | 651 peticiones, 0 % errores, p95 = 26.15 ms |
| P-09 | 10 inferencias, promedio = 4651 ms, mediana = 4522 ms, p95 = 6044 ms |

Ambos fueron cumplidos ampliamente.

---

## 4. Prueba de carga del motor ECO

La prueba de carga se realizó utilizando **k6** con un máximo de 10 usuarios virtuales.

El escenario incrementó progresivamente la cantidad de usuarios y posteriormente la redujo hasta finalizar la prueba.

### Resultados

| Indicador | Resultado |
|---|---:|
| Peticiones HTTP | 651 |
| Checks realizados | 1302 |
| Checks exitosos | 100 % |
| Checks fallidos | 0 |
| Tasa de errores HTTP | 0 % |
| Latencia promedio | 19.85 ms |
| Latencia máxima | 67.19 ms |
| p90 | 25.20 ms |
| p95 | 26.15 ms |
| Usuarios virtuales máximos | 10 |

### Umbrales

La prueba estableció los siguientes criterios:

- `p(95) < 800 ms`
- `http_req_failed < 5 %`

Los dos criterios fueron cumplidos:

- **p95 = 26.15 ms** → ✅
- **Errores = 0 %** → ✅

Además, los 1302 checks realizados fueron exitosos.

---

## 5. Caracterización de Ollama

La caracterización del modelo se realizó de manera **secuencial**, utilizando diez mensajes diferentes.

Cada solicitud utilizó el motor `ollama` y el modelo `qwen2.5:0.5b`.

### Resultados

| Indicador | Resultado |
|---|---:|
| Número de inferencias | 10 |
| Promedio | 4651 ms |
| Mediana | 4522 ms |
| p95 | 6044 ms |

Las diez inferencias fueron procesadas correctamente y devolvieron un resultado de clasificación.

---

## 6. Comparación de rendimiento

Los resultados muestran una diferencia significativa entre ambos motores.

| Motor | Tipo de prueba | Solicitudes | Latencia promedio | p95 | Errores |
|---|---|---:|---:|---:|---:|
| ECO | Prueba de carga | 651 | 19.85 ms | 26.15 ms | 0 % |
| Ollama | Caracterización secuencial | 10 | 4651 ms | 6044 ms | 0 % |

La comparación debe interpretarse teniendo en cuenta que las pruebas se realizaron bajo condiciones diferentes.

La prueba de ECO fue una prueba de carga con concurrencia de hasta 10 usuarios virtuales, mientras que la prueba de Ollama fue una medición secuencial de diez inferencias.

Por esta razón, los resultados no representan una comparación bajo exactamente la misma carga, pero sí permiten observar claramente el costo adicional de utilizar un modelo de lenguaje.

---

## 7. Análisis del cuello de botella

El principal cuello de botella identificado se encuentra en la **inferencia del modelo Ollama**.

El motor ECO presentó una latencia p95 de solamente **26.15 ms** durante la prueba de carga, con una tasa de errores de **0 %**. Esto demuestra que la API puede procesar solicitudes rápidamente cuando utiliza la clasificación basada en reglas.

Por otro lado, Ollama presentó un promedio de **4651 ms**, una mediana de **4522 ms** y un p95 de **6044 ms** en las diez inferencias secuenciales.

La diferencia indica que el tiempo principal no se pierde en la API ni en las operaciones básicas de PostgreSQL, sino en el procesamiento necesario para ejecutar el modelo de lenguaje.

ECO utiliza reglas de clasificación relativamente simples, mientras que Ollama requiere realizar una inferencia mediante el modelo `qwen2.5:0.5b`. Esta inferencia requiere recursos computacionales adicionales y explica la mayor latencia observada.

Por lo tanto, el cuello de botella principal del sistema es la **inferencia del modelo**, especialmente cuando se utiliza Ollama.

---

## 8. Propuestas de mejora

### 8.1 Mantener el modelo cargado en memoria

En equipos con memoria suficiente, mantener el modelo cargado puede reducir el tiempo necesario para preparar el modelo entre solicitudes.

Esto puede disminuir la latencia de las solicitudes posteriores y mejorar el rendimiento cuando Ollama sea utilizado frecuentemente.

### 8.2 Utilizar ECO como filtro previo

El motor ECO puede utilizarse como primera etapa de clasificación.

Las entradas que puedan clasificarse mediante reglas podrían procesarse directamente sin utilizar Ollama.

Solo los casos que requieran una clasificación más compleja serían enviados al modelo.

Esto reduciría la cantidad de inferencias realizadas por Ollama y disminuiría el tiempo promedio de respuesta.

### 8.3 Limitar la concurrencia hacia Ollama

Se puede establecer un límite de solicitudes simultáneas hacia el modelo.

Esto ayudaría a controlar el consumo de CPU y memoria y evitaría una degradación excesiva del rendimiento cuando aumente la cantidad de solicitudes.

### 8.4 Implementar caché

Se puede implementar una caché para almacenar temporalmente los resultados de entradas que ya hayan sido procesadas.

Si se recibe nuevamente un mensaje idéntico, la API podría devolver el resultado almacenado sin ejecutar nuevamente Ollama.

Esto permitiría reducir el número de inferencias y mejorar la latencia en escenarios con mensajes repetidos.

---

## 9. Conclusiones

Las pruebas realizadas permitieron validar el funcionamiento de la API desde diferentes perspectivas: funcionalidad, seguridad, conectividad, disponibilidad, persistencia y rendimiento.

El pipeline de integración continua ejecutó correctamente las pruebas automatizadas y la construcción de la aplicación.

La prueba de carga del motor ECO obtuvo un **p95 de 26.15 ms** y una tasa de errores de **0 %**, superando ampliamente los umbrales establecidos.

La caracterización de Ollama obtuvo un promedio de **4651 ms**, una mediana de **4522 ms** y un p95 de **6044 ms**.

Los resultados permiten concluir que el motor ECO ofrece una respuesta considerablemente más rápida, mientras que Ollama presenta un mayor costo de procesamiento debido a la inferencia del modelo.

Por esta razón, una estrategia adecuada para el sistema consiste en utilizar ECO como primera opción para clasificaciones rápidas y reservar Ollama para aquellos casos que requieran las capacidades adicionales del modelo.

---

## 10. Tecnologías utilizadas para las pruebas

- Node.js
- Express
- PostgreSQL 16
- Docker
- Docker Compose
- Postman
- k6
- Ollama
- Modelo `qwen2.5:0.5b`
- GitHub Actions