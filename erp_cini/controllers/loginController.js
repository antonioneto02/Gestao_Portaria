const axios = require("axios");
const dotenv = require("dotenv");
const sql = require("mssql");
const dbConfigDw = require("../config/dbConfigDw");

dotenv.config();
async function validaLogin(username, password, res, req) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  try {
    if (req && req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao limpar sessão anterior:", err);
        }
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });
    res.clearCookie("username", {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    const response = await axios.post(
      `http://${protheusServer}:9001/rest/api/oauth2/v1/token`,
      null,
      {
        params: {
          grant_type: "password",
          username: username,
          password: password,
        },
        timeout: 10000,
      }
    );

    let { access_token, refresh_token, scope, token_type, expires_in } = response.data || {};
    res.cookie("token", access_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3600000,
    });
    console.log('Cookie token set');
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 43200000,
    });
    console.log('Cookie refresh_token set');
    res.cookie("username", username, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 43200000,
    });

    if (!res.headersSent) {
      return res.status(200).json({ message: "Login bem-sucedido!", redirect: '/dashboard' });
    } else {
    }
  } catch (error) {
    console.error("Erro ao realizar login:", {
      message: error.message,
      stack: error.stack,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
      requestData: {
        username,
        protheusServer: process.env.PROTHEUS_SERVER
      }
    });
    return res.redirect("/loginPage?error=invalid_credentials");
  }
}

async function verificarSessao(origin, req, res, next) {
  if (req.session && req.session.userID && req.session.groups && req.session.groups.length > 0) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const timeoutMs = 120 * 60 * 1000; 
    
    if (now - lastActivity < timeoutMs) {
      req.session.lastActivity = now;
      
      try {
        let acessoLiberado = false;
        for (let i = 0; i < req.session.groups.length; i++) {
          const group = req.session.groups[i];
          const gruposEndpoints = await getGruposEndpoints(group.value, origin, req.session.userID);
          if (gruposEndpoints !== null) {
            acessoLiberado = true;
            break;
          }
        }
        if (!acessoLiberado) {
          return res.redirect("/acesso-restrito");
        }
        return next();
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
      }
    }
  }

  let protheusServer = process.env.PROTHEUS_SERVER;
  const token = req.cookies["token"];
  const refresh_token = req.cookies["refresh_token"];
  if (!token && !refresh_token) {
    return res.redirect("/loginPage");
  }

  if (!token && refresh_token) {
    const atualizou = await atualizaToken(refresh_token, res);
    if (!atualizou) {
      return res.redirect("/loginPage");
    }
  }

  let userID = "";
  const currentToken = req.cookies["token"];
  
  if (!currentToken) {
    return res.redirect("/loginPage");
  }
  
  try {
    const response2 = await axios.get(
      "http://" + protheusServer + ":9001/rest/users/getuserid",
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );
    userID = response2.data.userID;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    if (refresh_token) {
      const atualizou = await atualizaToken(refresh_token, res);
      if (atualizou) {
        try {
          const newToken = req.cookies["token"];
          const response2 = await axios.get(
            "http://" + protheusServer + ":9001/rest/users/getuserid",
            {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );
          userID = response2.data.userID;
        } catch (retryError) {
          console.error("Erro ao verificar sessão após atualizar token:", retryError);
          return res.redirect("/loginPage");
        }
      } else {
        return res.redirect("/loginPage");
      }
    } else {
      return res.redirect("/loginPage");
    }
  }

  let groups;
  let userName = "";
  try {
    const response3 = await axios.get(
      "http://" + protheusServer + ":9001/rest/users/" + userID,
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );
    groups = response3.data.groups;
    if (response3.data && response3.data.name) {
      const nameValue = response3.data.name;
      userName = (typeof nameValue === 'string') ? nameValue : (nameValue?.name || nameValue?.fullName || nameValue?.displayName || String(nameValue));
    } else if (response3.data && response3.data.fullName) {
      const fullNameValue = response3.data.fullName;
      userName = (typeof fullNameValue === 'string') ? fullNameValue : (fullNameValue?.name || fullNameValue?.fullName || fullNameValue?.displayName || String(fullNameValue));
    } else if (response3.data && response3.data.displayName) {
      const displayNameValue = response3.data.displayName;
      userName = (typeof displayNameValue === 'string') ? displayNameValue : (displayNameValue?.name || displayNameValue?.fullName || displayNameValue?.displayName || String(displayNameValue));
    } else {
      userName = req.cookies["username"] || "Usuário";
    }
    
    if (typeof userName !== 'string' || userName === '[object Object]' || userName.includes('[object Object]')) {
      userName = req.cookies["username"] || "Usuário";
    }
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    userName = req.cookies["username"] || "Usuário";
    return res.redirect("/loginPage");
  }
  
  if (typeof userName !== 'string' || userName === '[object Object]' || userName.includes('[object Object]')) {
    userName = req.cookies["username"] || "Usuário";
  }
  
  req.session.userID = userID;
  req.session.groups = groups;
  req.session.username = userName;
  req.session.lastActivity = Date.now(); 

  const originLower = (origin || '').toLowerCase();
  const isDashboardRequest = originLower === '/' || originLower.includes('/dashboard') || originLower.includes('/home');
  if (isDashboardRequest) {
    return next();
  }

  try {
    let acessoLiberado = false;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const gruposEndpoints = await getGruposEndpoints(group.value, origin, userID);
      if (gruposEndpoints !== null) {
        acessoLiberado = true;
        break;
      }
    }
    if (!acessoLiberado) {
      return res.redirect("/acesso-restrito");
    }
  } catch (error) {
    console.error("Erro:", error);
    next(error);
  }

  if (!req.session || !req.session.userID || !req.session.groups) {
    return res.redirect("/loginPage");
  }
  next();
}

async function getUserID(req) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  const token = req.cookies["token"];
  const refresh_token = req.cookies["refresh_token"];
  if (!token && !refresh_token) {
    return "";
  }
  
  let userID = "";
  try {
    const response2 = await axios.get(
      "http://" + protheusServer + ":9001/rest/users/getuserid",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    userID = response2.data.userID;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (refresh_token && req && req.res) {
        try {
          const atualizou = await atualizaToken(refresh_token, req.res);
          if (atualizou) {
            const newToken = req.cookies["token"];
            try {
              const response2 = await axios.get(
                "http://" + protheusServer + ":9001/rest/users/getuserid",
                {
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }
              );
              userID = response2.data.userID;
              return userID;
            } catch (retryError) {
              console.error("Erro ao verificar sessão após atualizar token:", retryError);
            }
          }
        } catch (refreshError) {
          console.error("Erro ao atualizar token:", refreshError);
        }
      }
      
      const authError = new Error("Sessão expirada. Faça login novamente.");
      authError.status = 401;
      authError.code = "SESSION_EXPIRED";
      throw authError;
    }
    
    const authError = new Error("Erro ao verificar autenticação. Faça login novamente.");
    authError.status = error.response?.status || 500;
    authError.code = "AUTH_ERROR";
    throw authError;
  }
  return userID;
}

async function getUserName(req) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  const token = req.cookies["token"];
  let userName = "";
  try {
    const userID = await getUserID(req);
    if (userID) {
      const response = await axios.get(
        "http://" + protheusServer + ":9001/rest/users/" + userID,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data && response.data.name) {
        const nameValue = response.data.name;
        userName = (typeof nameValue === 'string') ? nameValue : (nameValue?.name || nameValue?.fullName || nameValue?.displayName || String(nameValue));
      } else if (response.data && response.data.fullName) {
        const fullNameValue = response.data.fullName;
        userName = (typeof fullNameValue === 'string') ? fullNameValue : (fullNameValue?.name || fullNameValue?.fullName || fullNameValue?.displayName || String(fullNameValue));
      } else if (response.data && response.data.displayName) {
        const displayNameValue = response.data.displayName;
        userName = (typeof displayNameValue === 'string') ? displayNameValue : (displayNameValue?.name || displayNameValue?.fullName || displayNameValue?.displayName || String(displayNameValue));
      } else {
        userName = req.cookies["username"] || "";
      }
      
      if (typeof userName !== 'string' || userName === '[object Object]' || userName.includes('[object Object]')) {
        userName = req.cookies["username"] || "";
      }
    } else {
      userName = req.cookies["username"] || "";
    }
  } catch (error) {
    console.error("Erro ao obter nome do usuário:", error);
    userName = "";
  }
  
  return userName;
}

async function getUserGroups(req) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  const token = req.cookies["token"];
  let groups = [];
  try {
    const userID = await getUserID(req);
    if (userID) {
      const response = await axios.get(
        "http://" + protheusServer + ":9001/rest/users/" + userID,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      groups = response.data.groups || [];
    }
  } catch (error) {
    console.error("Erro ao obter grupos do usuário:", error);
    groups = [];
  }
  
  return groups;
}

async function getNomeGrupo(codGrupo) {
  let pool = null;
  try {
    const connectionPool = new sql.ConnectionPool(dbConfigDw);
    pool = await connectionPool.connect();
    const request = pool.request();
    request.input('CODGRUPO', sql.VarChar, codGrupo);
    const query = `
      SELECT TOP 1 RTRIM(GR__NOME) AS NomeGrupo
      FROM p11_prod..SYS_GRP_GROUP
      WHERE GR__ID = @CODGRUPO AND D_E_L_E_T_ <> '*'
    `;
    const result = await request.query(query);
    if (result.recordset.length > 0) {
      return result.recordset[0].NomeGrupo || '';
    }
    return '';
  } catch (error) {
    console.error("Erro ao obter nome do grupo:", error);
    return '';
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
      }
    }
  }
}

async function getGruposEndpoints(codGrupo, origin, userID = null) {
  let pool = null;
  try {
    const connectionPool = new sql.ConnectionPool(dbConfigDw);
    pool = await connectionPool.connect();
    const request = pool.request();
    request.input('CODGRUPO', sql.VarChar, codGrupo);
    request.input('ORIGIN', sql.VarChar, origin);
    if (userID) {
      request.input('USERID', sql.VarChar, userID);
      const queryEspecifica = `
        SELECT *
        FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
        WHERE (CODGRUPO = @CODGRUPO OR CODGRUPO = 'ALL')
          AND (
            ENDPOINT = @ORIGIN
            OR (GRUPO = @ORIGIN AND ENDPOINT IS NULL)
            OR (
              RIGHT(ENDPOINT, 1) = '/' AND @ORIGIN LIKE ENDPOINT + '%'
            )
          )
          AND IDUSUARIO = @USERID`;
      const resultEspecifica = await request.query(queryEspecifica);
      if (resultEspecifica.recordset.length > 0) {
        return resultEspecifica.recordset;
      }
    }
    const queryGeral = `
      SELECT *
      FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
      WHERE (CODGRUPO = @CODGRUPO OR CODGRUPO = 'ALL')
        AND (
          ENDPOINT = @ORIGIN
          OR (GRUPO = @ORIGIN AND ENDPOINT IS NULL)
          OR (
            RIGHT(ENDPOINT, 1) = '/' AND @ORIGIN LIKE ENDPOINT + '%'
          )
        )
        AND (IDUSUARIO IS NULL OR IDUSUARIO = '')`;
    const result = await request.query(queryGeral);
    if (result.recordset.length > 0) {
      return result.recordset;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
      }
    }
  }
}

async function verificarAcessoPrefixo(codGrupo, prefixo) {
  let pool = null;
  try {
    const connectionPool = new sql.ConnectionPool(dbConfigDw);
    pool = await connectionPool.connect();
    const request = pool.request();
    request.input('CODGRUPO', sql.VarChar, codGrupo);
    request.input('PREFIXO', sql.VarChar, prefixo + '%');
    request.input('PREFIXO_EXATO', sql.VarChar, prefixo);
    const query = `
      SELECT *
      FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
      WHERE (CODGRUPO = @CODGRUPO OR CODGRUPO = 'ALL')
        AND (
          ENDPOINT LIKE @PREFIXO
          OR GRUPO = @PREFIXO_EXATO
        )`;
    const result = await request.query(query);
    if (result.recordset.length > 0) {
      return result.recordset;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
      }
    }
  }
}

async function verificarAcessoRotasEmLote(codGrupos, rotas, userID = null) {
  let pool = null;
  try {
    if (!codGrupos || codGrupos.length === 0 || !rotas || rotas.length === 0) {
      return {};
    }

    const connectionPool = new sql.ConnectionPool(dbConfigDw);
    pool = await connectionPool.connect();
    const request = pool.request();
    const gruposList = codGrupos.map((_, idx) => {
      request.input(`CODGRUPO${idx}`, sql.VarChar, codGrupos[idx]);
      return `@CODGRUPO${idx}`;
    }).join(', ');
    
    let query;
    if (userID) {
      request.input('USERID', sql.VarChar, userID);
      query = `
        SELECT CODGRUPO, ENDPOINT, GRUPO, IDUSUARIO
        FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
        WHERE (CODGRUPO IN (${gruposList}) OR CODGRUPO = 'ALL')
          AND IDUSUARIO = @USERID`;
      
      const resultEspecifica = await request.query(query);
      if (resultEspecifica.recordset.length > 0) {
        const acessos = {};
        rotas.forEach(rota => {
          acessos[rota] = false;
        });

        resultEspecifica.recordset.forEach(record => {
          const endpoint = record.ENDPOINT ? record.ENDPOINT.trim() : null;
          const grupoRoute = record.GRUPO ? record.GRUPO.trim() : null;
          rotas.forEach(rota => {
            if (acessos[rota]) return; 
            if (endpoint === rota) {
              acessos[rota] = true;
            }
            else if (grupoRoute === rota && (!endpoint || endpoint === '')) {
              acessos[rota] = true;
            }
            else if (endpoint && endpoint.endsWith('/') && rota.startsWith(endpoint)) {
              acessos[rota] = true;
            }
          });
        });

        return acessos;
      }
    }
    
    query = `
      SELECT CODGRUPO, ENDPOINT, GRUPO, IDUSUARIO
      FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
      WHERE (CODGRUPO IN (${gruposList}) OR CODGRUPO = 'ALL')
        AND (IDUSUARIO IS NULL OR IDUSUARIO = '')`;
    
    const result = await request.query(query);
    const acessos = {};
    rotas.forEach(rota => {
      acessos[rota] = false;
    });

    result.recordset.forEach(record => {
      const endpoint = record.ENDPOINT ? record.ENDPOINT.trim() : null;
      const grupoRoute = record.GRUPO ? record.GRUPO.trim() : null;
      rotas.forEach(rota => {
        if (acessos[rota]) return; 
        if (endpoint === rota) {
          acessos[rota] = true;
        }
        else if (grupoRoute === rota && (!endpoint || endpoint === '')) {
          acessos[rota] = true;
        }
        else if (endpoint && endpoint.endsWith('/') && rota.startsWith(endpoint)) {
          acessos[rota] = true;
        }
      });
    });

    return acessos;
  } catch (error) {
    console.error('Erro ao verificar acesso em lote:', error);
    return {};
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
      }
    }
  }
}

async function getUsuarios() {
  let pool = null;
  try {
    const connectionPool = new sql.ConnectionPool(dbConfigDw);
    pool = await connectionPool.connect();

    let query = "";
    query += " SELECT *";
    query += " FROM OBZ003 ";
    query += " WHERE 1=1 ";

    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      return result.recordset;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
      }
    }
  }
}
async function verificarEAtualizarToken(req, res, next) {
  if (req.session && req.session.userID && req.session.groups && req.session.groups.length > 0) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const timeoutMs = 120 * 60 * 1000; 
    
    if (now - lastActivity < timeoutMs) {
      req.session.lastActivity = now;
      return next();
    }
  }

  const token = req.cookies["token"];
  const refresh_token = req.cookies["refresh_token"];

  if (!token && refresh_token) {
    const atualizou = await atualizaToken(refresh_token, res);
    if (!atualizou) {
      return res.redirect("/loginPage");
    }
    next();
  } else if (!token && !refresh_token) {
    return res.redirect("/loginPage");
  } else {
    next();
  }
}

async function atualizaToken(refresh_token_param, res) {
  let protheusServer = process.env.PROTHEUS_SERVER;

  try {
    let response = await axios.post(
      `http://${protheusServer}:9001/rest/api/oauth2/v1/token`,
      null,
      {
        params: {
          grant_type: "refresh_token",
          refresh_token: refresh_token_param,
        },
      }
    );

    let { access_token, refresh_token } = response.data;
    res.cookie("token", access_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3600000,
    });
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 43200000,
    });

    return true;
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return false;
  }
}

module.exports = {
  validaLogin,
  verificarEAtualizarToken,
  verificarSessao,
  getUsuarios,
  getUserID,
  getGruposEndpoints,
  getUserName,
  getUserGroups,
  getNomeGrupo,
  verificarAcessoPrefixo,
  verificarAcessoRotasEmLote,
};
