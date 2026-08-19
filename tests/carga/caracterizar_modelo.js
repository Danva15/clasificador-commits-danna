const MENSAJES = [
  "agrega el endpoint de historial",
  "corrige el error de conexion a la base de datos",
  "actualiza el manual de instalacion",
  "agrega pruebas del clasificador",
  "renombra las variables del modulo de conexion",
  "actualiza las dependencias del proyecto",
  "implementa el healthcheck del contenedor",
  "arregla el calculo de la latencia",
  "documenta la politica de seguridad",
  "simplifica la funcion de registro",
];

const tiempos = [];

async function caracterizar() {
  for (let i = 0; i < MENSAJES.length; i++) {
    const texto = MENSAJES[i];

    const inicio = Date.now();

    const respuesta = await fetch("http://localhost:3000/clasificar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texto,
        motor: "ollama",
      }),
    });

    const ms = Date.now() - inicio;
    const resultado = await respuesta.json();

    tiempos.push(ms);

    console.log(
      `${String(i + 1).padStart(2, " ")}. ${String(ms).padStart(8, " ")} ms -> ${String(resultado.tipo).padEnd(10, " ")} | ${texto}`
    );
  }

  const ordenados = [...tiempos].sort((a, b) => a - b);

  const promedio =
    tiempos.reduce((suma, tiempo) => suma + tiempo, 0) / tiempos.length;

  const mitad = Math.floor(ordenados.length / 2);

  const mediana =
    ordenados.length % 2 === 0
      ? (ordenados[mitad - 1] + ordenados[mitad]) / 2
      : ordenados[mitad];

  const indiceP95 = Math.ceil(ordenados.length * 0.95) - 1;
  const p95 = ordenados[indiceP95];

  console.log("\n--- RESULTADOS OLLAMA ---");
  console.log(`Promedio: ${promedio.toFixed(0)} ms`);
  console.log(`Mediana: ${mediana.toFixed(0)} ms`);
  console.log(`p95: ${p95.toFixed(0)} ms`);
}

caracterizar().catch((error) => {
  console.error("Error durante la caracterización:", error);
  process.exit(1);
});
