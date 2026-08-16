const express = require('express');
const conexionPostgres = require('./db');

const TIPOS = ['feat', 'fix', 'docs', 'test', 'chore', 'refactor'];

const REGLAS = {
  fix: /\b(fix|corrig|arregl|error|bug|falla)/i,
  docs: /\b(doc|readme|manual|coment)/i,
  test: /\b(test|prueba|pytest|cobertura)/i,
  chore: /\b(actualiz|dependenc|version|limpi|config)/i,
  refactor: /\b(refactor|reorganiz|renombr|simplific)/i,
  feat: /\b(agreg|add|nuev|implement|crear|feature)/i
};

function clasificarEco(texto) {
  for (const tipo of Object.keys(REGLAS)) {
    if (REGLAS[tipo].test(texto)) {
      return tipo;
    }
  }
  return 'chore';
}

async function clasificarOllama(texto) {
  const prompt = `
  Clasifica el siguiente mensaje de commit en UNA de estas categorías:
  feat, fix, docs, test, chore, refactor.

  Responde únicamente con una de esas palabras.

  Mensaje:
  ${texto}

  Categoría:
  `;

  const respuesta = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen2.5:0.5b',
      prompt: prompt,
      stream: false,
      options: {
        num_ctx: 1024,
        num_predict: 8,
        temperature: 0
      }
    })
  });

  if (!respuesta.ok) {
    throw new Error(`Ollama respondió con HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  const textoSalida = datos.response.trim().toLowerCase();

  for (const tipo of TIPOS) {
    if (textoSalida.includes(tipo)) {
      return tipo;
    }
  }

  return 'desconocido';
}

const app = express();

const PORT = 3000;

app.use(express.json());

app.get('/', (request, response) => {
  response.json({
    message: 'GitHub Assistant API funcionando'
  });
});

app.post('/analyses', async (request, response) => {
  try {
    const {
      repository,
      commit_hash,
      summary,
      risks,
      suggestions
    } = req.body;

    const resultado = await conexionPostgres.query(
      `INSERT INTO analyses
       (repository, commit_hash, summary, risks, suggestions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [repository, commit_hash, summary, risks, suggestions]
    );

    response.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error creando análisis:', error);

    response.status(500).json({
      error: 'Error al guardar el análisis'
    });
  }
});

app.post('/clasificar', async (request, response) => {
  try {
    const { texto, motor } = request.body;

    if (!texto) {
      return response.status(400).json({
        error: 'El campo texto es obligatorio'
      });
    }

    if (motor !== 'eco' && motor !== 'ollama') {
      return response.status(400).json({
        error: 'motor debe ser eco u ollama'
      });
    }

    const inicio = Date.now();

    let tipo;
    let modelo;

    if (motor === 'eco') {
      modelo = 'reglas-v1';
      tipo = clasificarEco(texto);
    } else {
      modelo = 'qwen2.5:0.5b';
      tipo = await clasificarOllama(texto);
    }

    const latencia_ms = Date.now() - inicio;

    const resultado = await conexionPostgres.query(
      `INSERT INTO analyses
       (motor, modelo, entrada, salida, latencia_ms)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [motor, modelo, texto, tipo, latencia_ms]
    );

    response.json({
      motor: motor,
      modelo: modelo,
      entrada: texto,
      tipo: tipo,
      latencia_ms: latencia_ms,
      id: resultado.rows[0].id
    });

  } catch (error) {
    console.error('Error clasificando commit:', error);

    response.status(500).json({
      error: 'Error al clasificar el commit'
    });
  }
});

app.post('/test-ollama', async (request, response) => {
  try {
    const respuesta = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2.5:0.5b',
        prompt: 'Explica brevemente qué es un commit de Git.',
        stream: false
      })
    });

    const datos = await respuesta.json();

    response.json({
      respuesta: datos.response
    });
  } catch (error) {
    console.error('Error comunicando con Ollama:', error);

    response.status(500).json({
      error: 'No se pudo comunicar con Ollama'
    });
  }
});

app.get('/analyses', async (request, response) => {
  try {
    const resultado = await conexionPostgres.query(
      'SELECT * FROM analyses ORDER BY id DESC'
    );

    response.json(resultado.rows);
  } catch (error) {
    console.error('Error consultando analyses:', error);

    response.status(500).json({
      error: 'Error al consultar los análisis'
    });
  }
});

app.get('/health', async (request, response) => {
  try {
    await conexionPostgres.query('SELECT 1');

    response.json({
      estado: 'ok',
      base_datos: 'ok'
    });
  } catch (error) {
    console.error('Error en health:', error);

    response.status(503).json({
      estado: 'error',
      base_datos: 'error'
    });
  }
});

app.get('/inferencias', async (request, response) => {
  try {
    const limite = Number(request.query.limite) || 20;

    const resultado = await conexionPostgres.query(
      `SELECT
        id,
        created_at,
        motor,
        modelo,
        entrada,
        salida,
        latencia_ms
       FROM analyses
       ORDER BY id DESC
       LIMIT $1`,
      [limite]
    );

    response.json(resultado.rows);

  } catch (error) {
    console.error('Error consultando inferencias:', error);

    response.status(500).json({
      error: 'Error al consultar las inferencias'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});