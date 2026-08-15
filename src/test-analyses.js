const conexionPostgres = require('./db');

async function probarTabla() {
  try {
    const resultado = await conexionPostgres.query(
      `INSERT INTO analyses
        (repository, commit_hash, summary, risks, suggestions)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
    [
        'mi-repositorio-prueba',
        'def456',
        'Análisis de prueba realizado correctamente.',
        'No se detectaron riesgos importantes.',
        'Revisar el código y continuar con las pruebas.'
    ]
  );

    console.log('registro insertado correctamente');
    console.log(resultado.rows[0]);
  } catch (error) {
    console.error('Error trabajando con analyses:', error.message);
  } finally {
    await conexionPostgres.end();
  }
}

probarTabla();