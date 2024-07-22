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

export default {
  create,
};
