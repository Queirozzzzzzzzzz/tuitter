import validator from "models/validator";
import db from "infra/database";

function validateCreateSchema(rawData) {
  const cleanValues = validator(rawData, {
    owner_id: "required",
    parent_id: "optional",
    quote_id: "optional",
    body: "required",
  });

  return cleanValues;
}

async function throwIfParentDoesNotExist(rawData) {
  const parentExists = await db.query({
    text: "SELECT * FROM tuits WHERE id = $1;",
    values: [rawData.parent_id],
  });
  if (!parentExists) {
    throw new ValidationError({
      message: `Você está tentando criar um comentário em um tuit que não existe.`,
      action: `Utilize um "parent_id" que aponte para um conteúdo existente.`,
      stack: new Error().stack,
      errorLocationCode: "MODEL:TUIT:CHECK_IF_PARENT_ID_EXISTS:NOT_FOUND",
      statusCode: 400,
      key: "parent_id",
    });
  }
}

async function create(rawData, options = {}) {
  const validContent = validateCreateSchema(rawData);
  await throwIfParentDoesNotExist(rawData);

  const newTuit = await runInsertQuery(validContent, {
    transaction: options.transaction,
  });

  return newTuit;
}

async function runInsertQuery(tuit, options) {
  const query = {
    text: `
    INSERT INTO
      tuits (owner_id, parent_id, quote_id, body)
    VALUES
      ($1, $2, $3, $4)
    RETURNING
      *
    ;`,
    values: [tuit.owner_id, tuit.parent_id, tuit.quote_id, tuit.body],
  };

  const results = await db.query(query, { transaction: options.transaction });
  return results.rows[0];
}

async function findById(id) {
  const query = {
    text: `
    SELECT 
      *
    FROM 
      tuits 
    WHERE 
      id = $1
    ;`,
    values: [id],
  };

  const results = await db.query(query);

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: `O id "${id}" não foi encontrado no sistema.`,
      action: 'Verifique se o "id" está digitado corretamente.',
      stack: new Error().stack,
      errorLocationCode: "MODEL:TUIT:FIND_BY_ID:NOT_FOUND",
      key: "id",
    });
  }

  return results.rows[0];
}

async function disable(id, options = {}) {
  const query = {
    text: `
    UPDATE 
      tuits 
    SET 
      status = 'disabled',
      updated_at = (now() at time zone 'utc')
    WHERE
      id = $1
    RETURNING
      *
    ;`,
    values: [id],
  };

  const results = await db.query(query, options);

  return results.rows[0];
}

async function checkActionExists(tableName, userId, tuitId, options = {}) {
  const query = {
    text: `SELECT * FROM ${tableName} WHERE owner_id = $1 AND tuit_id = $2;`,
    values: [userId, tuitId],
  };

  return await db.query(query, options);
}

async function insertFeedbackTableQuery(
  tableName,
  isInserting,
  userId,
  tuitId,
  options = {},
) {
  const queryText = `
    ${isInserting ? "INSERT INTO" : "DELETE FROM"} 
    ${tableName} ${isInserting ? "(owner_id, tuit_id) VALUES ($1, $2)" : "WHERE owner_id = $1 AND tuit_id = $2 "}
    RETURNING 
      *
    ;`;
  const query = { text: queryText, values: [userId, tuitId] };

  return await db.query(query, options);
}

async function insertTuitFeedbackQuery(
  isInserting,
  tableName,
  tuitId,
  options = {},
) {
  const queryText = `
    UPDATE 
      tuits 
    SET 
      ${tableName} = (${tableName} ${isInserting ? "+" : "-"} 1),
      updated_at = (now() at time zone 'utc') 
    WHERE 
      id = $1 
    RETURNING 
      *
    ;`;
  const query = { text: queryText, values: [tuitId] };
  return await db.query(query, options);
}

async function performFeedbackAction(tableName, userId, tuitId, options = {}) {
  const isActionExistsResults = await checkActionExists(
    tableName,
    userId,
    tuitId,
    options,
  );
  const isInserting = isActionExistsResults.rows.length === 0;

  if (tableName === "views" && !isInserting) return null;

  const results = await insertFeedbackTableQuery(
    tableName,
    isInserting,
    userId,
    tuitId,
    options,
  );

  await insertTuitFeedbackQuery(isInserting, tableName, tuitId, options);

  return results.rows[0];
}

async function view(userId, tuitId, options = {}) {
  return performFeedbackAction("views", userId, tuitId, options);
}

async function like(userId, tuitId, options = {}) {
  return performFeedbackAction("likes", userId, tuitId, options);
}

async function retuit(userId, tuitId, options = {}) {
  return performFeedbackAction("retuits", userId, tuitId, options);
}

async function bookmark(userId, tuitId, options = {}) {
  return performFeedbackAction("bookmarks", userId, tuitId, options);
}

async function comment(rawData, options = {}) {
  const comment = await create(rawData, options);
  await insertTuitFeedbackQuery(true, "comments", comment.parent_id, options);

  return comment;
}

async function quote(rawData, options = {}) {
  const quote = await create(rawData, options);
  await insertTuitFeedbackQuery(true, "quotes", quote.quote_id, options);

  return quote;
}

export default {
  create,
  findById,
  disable,
  view,
  like,
  retuit,
  bookmark,
  comment,
  quote,
};
