import cookie from "cookie";
import crypto from "node:crypto";

import { UnauthorizedError } from "errors";
import db from "infra/database";
import validator from "models/validator";

const SESSION_EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function create(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * SESSION_EXPIRATION_IN_SECONDS);

  const query = {
    text: `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3) RETURNING *;`,
    values: [token, userId, expiresAt],
  };

  const res = await db.query(query);
  return res.rows[0];
}

async function findByToken(token) {
  validator(
    {
      session_id: token,
    },
    {
      session_id: "required",
    },
  );

  const query = {
    text: `SELECT * FROM sessions WHERE token = $1 AND expires_at > now();`,
    values: [token],
  };

  const res = await db.query(query);
  return res.rows[0];
}

async function findByCookies(cookies) {
  validator(cookies, {
    session_id: "required",
  });

  const token = cookies?.session_id;

  if (!token) {
    throw new UnauthorizedError({
      message: `Usuário não possui sessão ativa.`,
      action: `Verifique se este usuário está logado.`,
    });
  }

  const obj = await findByToken(token);

  if (!obj) {
    throw new UnauthorizedError({
      message: `Usuário não possui sessão ativa.`,
      action: `Verifique se este usuário está logado.`,
    });
  }

  return obj;
}

async function findById(id) {
  const query = {
    text: `SELECT * FROM sessions WHERE id = $1;`,
    values: [id],
  };

  const results = await db.query(query);
  return results.rows[0];
}

function setSessionCookie(token, res) {
  res.setHeader("Set-Cookie", [
    cookie.serialize("session_id", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_EXPIRATION_IN_SECONDS,
    }),
  ]);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [
    cookie.serialize("session_id", "invalid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: -1,
    }),
  ]);
}

async function renew(sessionId, res) {
  const sessionObjRenewed = await renewObjInDatabase(sessionId);
  setSessionCookie(sessionObjRenewed.token, res);
  return sessionObjRenewed;
}

async function renewObjInDatabase(sessionId) {
  const expiresAt = new Date(Date.now() + 1000 * SESSION_EXPIRATION_IN_SECONDS);

  const query = {
    text: `UPDATE sessions SET expires_at = $2, updated_at = now() WHERE id = $1 RETURNING *;`,
    values: [sessionId, expiresAt],
  };

  const results = await db.query(query);
  return results.rows[0];
}

async function expireById(id) {
  const query = {
    text: `UPDATE sessions SET expires_at = created_at - interval '1 day', updated_at = now() WHERE id = $1 RETURNING *;`,
    values: [id],
  };

  const results = await db.query(query);
  return results.rows[0];
}

export default {
  create,
  findByCookies,
  findByToken,
  findById,
  setSessionCookie,
  clearSessionCookie,
  renew,
  expireById,
};
