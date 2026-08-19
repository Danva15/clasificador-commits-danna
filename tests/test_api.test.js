const test = require('node:test');
const assert = require('node:assert');
const { app, clasificarEco } = require('../src/server');

let servidor;
let baseUrl;

test.before(async () => {
  servidor = app.listen(0);

  const puerto = servidor.address().port;
  baseUrl = `http://localhost:${puerto}`;
});

test.after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
});

async function request(path, options = {}) {
  const respuesta = await fetch(`${baseUrl}${path}`, options);
  const cuerpo = await respuesta.json();

  return {
    status: respuesta.status,
    body: cuerpo
  };
}

test('GET /health responde correctamente', async () => {
  const respuesta = await request('/health');

  assert.strictEqual(respuesta.status, 200);
  assert.strictEqual(respuesta.body.estado, 'ok');
});

test('POST /clasificar con ECO devuelve tipo correcto', async () => {
  const respuesta = await request('/clasificar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      texto: 'corrige el error de login',
      motor: 'eco'
    })
  });

  assert.strictEqual(respuesta.status, 200);
  assert.strictEqual(respuesta.body.tipo, 'fix');
  assert.ok(respuesta.body.latencia_ms >= 0);
});

test('POST /clasificar rechaza un motor inválido', async () => {
  const respuesta = await request('/clasificar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      texto: 'hola',
      motor: 'inventado'
    })
  });

  assert.strictEqual(respuesta.status, 400);
});

test('Las reglas del motor ECO clasifican correctamente', () => {
  assert.strictEqual(
    clasificarEco('agrega el endpoint de salud'),
    'feat'
  );

  assert.strictEqual(
    clasificarEco('actualiza el readme'),
    'docs'
  );

  assert.strictEqual(
    clasificarEco('agrega pruebas unitarias'),
    'test'
  );
});

test('GET /inferencias devuelve una lista', async () => {
  const respuesta = await request('/inferencias?limite=5');

  assert.strictEqual(respuesta.status, 200);
  assert.ok(Array.isArray(respuesta.body));
});
