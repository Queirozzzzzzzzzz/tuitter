import db from "infra/database";
import validator from "models/validator";
import authentication from "models/authentication";
import { ValidationError, NotFoundError } from "errors";

function validatePostSchema(postedUserData) {
  const cleanValues = validator(postedUserData, {
    tag: "required",
    username: "required",
    email: "required",
    password: "required",
    description: "optional",
    picture: "optional",
  });

  return cleanValues;
}

async function create(rawData) {
  const validData = validatePostSchema(rawData);
  await validateUniqueTag(validData.tag);
  await validateUniqueUsername(validData.username);
  await validateUniqueEmail(validData.email);
  await hashPasswordInObject(validData);

  validData.features = [
    "read:session",
    "create:session",
    "read:user",
    "read:user:self",
    "update:user",
    "read:tuit",
    "read:tuit:list",
    "update:tuit",
    "create:tuit",
  ];

  const query = {
    text: `
    INSERT INTO 
      users (tag, username, email, password, features) 
    VALUES 
      ($1, $2, $3, $4, $5) 
    RETURNING 
      *
    ;`,
    values: [
      validData.tag,
      validData.username,
      validData.email,
      validData.password,
      validData.features,
    ],
  };

  const res = await db.query(query);
  const newUser = res.rows[0];

  return newUser;
}

function createAnonymous() {
  return {
    features: ["create:session", "create:user"],
  };
}

async function validateUniqueTag(tag, options) {
  const query = {
    text: `
    SELECT 
      tag 
    FROM 
      users 
    WHERE 
      LOWER(tag) = LOWER($1)
    ;`,
    values: [tag],
  };

  const results = await db.query(query, options);

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `A "tag" informada já está sendo usada.`,
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:VALIDATE_UNIQUE_TAG:ALREADY_EXISTS",
      key: "tag",
    });
  }
}

async function validateUniqueUsername(username, options) {
  const query = {
    text: `
    SELECT 
      username 
    FROM 
      users 
    WHERE 
      LOWER(username) = LOWER($1)
    ;`,
    values: [username],
  };

  const results = await db.query(query, options);

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O "username" informado já está sendo usado.`,
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:VALIDATE_UNIQUE_USERNAME:ALREADY_EXISTS",
      key: "username",
    });
  }
}

async function validateUniqueEmail(email, options) {
  const query = {
    text: `
    SELECT 
      email 
    FROM 
      users 
    WHERE 
      LOWER(email) = LOWER($1)
    ;`,
    values: [email],
  };

  const results = await db.query(query, options);

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O "email" informado já está sendo usado.`,
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:VALIDATE_UNIQUE_EMAIL:ALREADY_EXISTS",
      key: "email",
    });
  }
}

async function hashPasswordInObject(obj) {
  obj.password = await authentication.hashPassword(obj.password);
  return obj;
}

async function findById(id) {
  const query = {
    text: `
    SELECT 
      *
    FROM 
      users 
    WHERE 
      id = $1
    ;`,
    values: [id],
  };

  const results = await db.query(query);

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: `O id "${userId}" não foi encontrado no sistema.`,
      action: 'Verifique se o "id" está digitado corretamente.',
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:FIND_BY_ID:NOT_FOUND",
      key: "id",
    });
  }

  return results.rows[0];
}

async function findByEmail(email) {
  const query = {
    text: `
    SELECT 
      * 
    FROM 
      users 
    WHERE 
      LOWER(email) = LOWER($1) 
    LIMIT 
      1
    ;`,
    values: [email],
  };

  const results = await db.query(query);

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: `O email informado não foi encontrado no sistema.`,
      action: 'Verifique se o "email" está digitado corretamente.',
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:FIND_BY_EMAIL:NOT_FOUND",
      key: "email",
    });
  }

  return results.rows[0];
}

async function findByTag(tag, options = {}) {
  const query = {
    text: `
    SELECT 
      * 
    FROM 
      users 
    WHERE 
      LOWER(tag) = LOWER($1) 
    LIMIT 
      1
    ;`,
    values: [tag],
  };

  const results = await db.query(query, options);

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: `O usuário informado não foi encontrado no sistema.`,
      action: 'Verifique se o "username" está digitado corretamente.',
      stack: new Error().stack,
      errorLocationCode: "MODEL:USER:FIND_BY_TAG:NOT_FOUND",
      key: "tag",
    });
  }

  return results.rows[0];
}

async function removeFeatures(id, features) {
  let lastUpdated;

  if (features?.length > 0) {
    for (const feature of features) {
      const query = {
        text: `
        UPDATE 
          users 
        SET 
          features = array_remove(features, $1), 
          updated_at = (now() at time zone 'utc') 
        WHERE 
          id = $2 
        RETURNING 
          *
        ;`,
        values: [feature, id],
      };

      const results = await db.query(query);
      lastUpdated = results.rows[0];
    }
  } else {
    const query = {
      text: `
      UPDATE 
        users 
      SET 
        features = '{}', 
        updated_at = (now() at time zone 'utc') 
      WHERE 
        id = $1 
      RETURNING 
        *
      ;`,
      values: [id],
    };

    const results = await db.query(query);
    lastUpdated = results.rows[0];
  }

  return lastUpdated;
}

async function addFeatures(id, features, options) {
  const query = {
    text: `
    UPDATE 
      users 
    SET 
      features = array_cat(features, $2), 
      updated_at = (now() at time zone 'utc') 
    WHERE 
      id = $1 
    RETURNING 
      *
    ;`,
    values: [id, features],
  };

  const results = await db.query(query, options);

  return results.rows[0];
}

async function update(tag, data, options = {}) {
  const validData = await validatePatchSchema(data);
  const oldUser = await findByTag(tag, {
    transaction: options.transaction,
  });

  if (
    "username" in validData &&
    oldUser.username.toLowerCase() !== validData.username.toLowerCase()
  ) {
    await validateUniqueUsername(validData.username, {
      transaction: options.transaction,
    });
  }

  if ("email" in validData) {
    await validateUniqueEmail(validData.email, {
      transaction: options.transaction,
    });
  }

  if ("password" in validData) {
    await hashPasswordInObject(validData);
  }

  const newUser = { ...oldUser, ...validData };

  const updatedUser = await runUpdateQuery(oldUser, newUser, {
    transaction: options.transaction,
  });

  return updatedUser;
}

async function runUpdateQuery(oldUser, newUser, options) {
  const query = {
    text: `
    UPDATE 
      users 
    SET 
      username = $2, 
      email = $3,
      password = $4,
      description = $5,
      picture = $6,
      updated_at = (now() at time zone 'utc')
    WHERE
      id = $1
    RETURNING
      *
    ;`,
    values: [
      oldUser.id,
      newUser.username,
      newUser.email,
      newUser.password,
      newUser.description,
      newUser.picture,
    ],
  };

  const results = await db.query(query, options);
  return results.rows[0];
}

async function validatePatchSchema(data) {
  const cleanValues = validator(data, {
    username: "optional",
    email: "optional",
    password: "optional",
    description: "optional",
    picture: "optional",
  });

  return cleanValues;
}

export default {
  create,
  findById,
  findByEmail,
  findByTag,
  createAnonymous,
  removeFeatures,
  update,
  addFeatures,
};
