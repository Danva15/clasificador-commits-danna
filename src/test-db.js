const conexionPostgres = require('./db');

async function probarConexion() {
    try{
        const resultado = await conexionPostgres.query('SELECT NOW()');

        console.log('conexion con PostgreSQL exitosa');
        console.log('hora del servidor:', resultado.rows[0].now);
    } catch (error) {
        console.error('error conectado con PostgreSQL:', error.message);
    } finally {
        await conexionPostgres.end();
    }
}

probarConexion();