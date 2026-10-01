require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER_ERP,
  password: process.env.DB_PASSWORD_ERP,
  server: process.env.DB_SERVER_ERP,
  database: process.env.DB_DATABASE_PROTHEUS,
  options: { encrypt: true, trustServerCertificate: true },
  requestTimeout: 60000,
};

(async () => {
  try {
    const pool = await sql.connect(config);

    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SA1010'
        AND COLUMN_NAME IN ('A1_END','A1_NR_END','A1_XMAILAD','A1_XFUNCIO','A1_BAIRRO','A1_COMPLEM')
      ORDER BY COLUMN_NAME
    `);
    console.log('--- COLUNAS FISICAS SA1010 ---');
    console.log(JSON.stringify(cols.recordset, null, 2));

    const sx3 = await pool.request().query(`
      SELECT X3_CAMPO, X3_TAMANHO, X3_TIPO, X3_PICTURE, X3_CONTEXT, X3_VALID
      FROM SX3010
      WHERE X3_ARQUIVO = 'SA1' AND X3_CAMPO IN ('A1_END    ','A1_NR_END ','A1_XMAILAD','A1_XFUNCIO')
        AND D_E_L_E_T_ = ''
    `);
    console.log('--- SX3 ATUAL ---');
    console.log(JSON.stringify(sx3.recordset, null, 2));

    await pool.close();
  } catch (err) {
    console.error('ERRO:', err.message);
  }
})();
