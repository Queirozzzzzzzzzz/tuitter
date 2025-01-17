import { ForbiddenError, ValidationError } from "errors";

const availableFeatures = new Set([
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",

  // ACTIVATION_TOKEN
  "read:activation_token",

  // SESSION
  "create:session",
  "read:session",

  // TUIT
  "read:tuit",
  "read:tuit:list",
  "update:tuit",
  "update:tuit:others",
  "create:tuit",
  "create:tuit:feedback",

  // MODERATION
  "update:user:others",
  "ban:user",
]);

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);

  if (!user.features.includes(feature)) return false;

  switch (feature) {
    case "update:user":
      return resource?.id && user.id === resource.id;

    case "update:tuit":
      return (
        (resource?.id && user.id === resource.owner_id) ||
        user.features.includes("update:tuit:others")
      );
  }

  if (!resource) return true;

  return false;
}

function filterInput(user, feature, input, target) {
  validateUser(user);
  validateFeature(feature);
  validateInput(input);

  let filteredInputValues = {};

  if (feature === "create:session" && can(user, feature)) {
    filteredInputValues = {
      email: input.email,
      password: input.password,
    };
  }

  if (feature === "create:user" && can(user, feature)) {
    filteredInputValues = {
      tag: input.tag,
      username: input.username,
      email: input.email,
      password: input.password,
    };
  }

  if (feature === "update:user" && can(user, feature, target)) {
    filteredInputValues = {
      tag: input.tag,
      username: input.username,
      email: input.email,
      password: input.password,
      description: input.description,
      picture: input.picture,
    };
  }

  if (feature === "update:user:others" && can(user, feature)) {
    filteredInputValues = {
      description: input.description,
      picture: input.picture,
    };
  }

  if (feature === "create:tuit" && can(user, feature)) {
    filteredInputValues = {
      body: input.body,
    };
  }

  if (feature === "update:tuit" && can(user, feature, target)) {
    filteredInputValues = {
      tuit_id: input.tuit_id,
    };
  }

  if (feature === "ban:user" && can(user, feature)) {
    filteredInputValues = {
      ban_type: input.ban_type,
    };
  }

  return JSON.parse(JSON.stringify(filteredInputValues));
}

function filterOutput(user, feature, output) {
  validateUser(user);
  validateFeature(feature);
  validateOutput(output);

  let filteredOutputValues = {};

  if (feature === "read:user:self") {
    if (user.id && user.id === output.id) {
      filteredOutputValues = {
        id: output.id,
        tag: output.tag,
        username: output.username,
        email: output.email,
        features: output.features,
        description: output.description,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "create:session" && can(user, feature)) {
    if (user.id && user.id === output.user_id) {
      filteredOutputValues = {
        id: output.id,
        token: output.token,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:session" && can(user, feature)) {
    if (user.id && user.id === output.user_id) {
      filteredOutputValues = {
        id: output.id,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:user" && can(user, feature)) {
    filteredOutputValues = {
      id: output.id,
      tag: output.tag,
      username: output.username,
      features: output.features,
      description: output.description,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (feature === "read:tuit" && can(user, feature)) {
    filteredOutputValues = {
      id: output.id,
      owner_id: output.owner_id,
      parent_id: output.parent_id,
      quote_id: output.quote_id,
      status: output.status,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };

    if (!(output.status === "disabled")) {
      filteredOutputValues = {
        ...filteredOutputValues,
        body: output.body,
        likes: output.likes,
        retuits: output.retuits,
        bookmarks: output.bookmarks,
      };
    }
  }

  return JSON.parse(JSON.stringify(filteredOutputValues));
}

function validateUser(user) {
  if (!user) {
    throw new ValidationError({
      message: `Nenhum "user" foi especificado para a ação de autorização.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }

  if (!user.features || !Array.isArray(user.features)) {
    throw new ValidationError({
      message: `"user" não possui "features" ou não é um array.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }
}

function validateFeature(feature) {
  if (!feature) {
    throw new ValidationError({
      message: `Nenhuma "feature" foi especificada para a ação de autorização.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }

  if (!availableFeatures.has(feature)) {
    throw new ValidationError({
      message: `A feature utilizada não está disponível na lista de features existentes.`,
      action: `Contate o suporte informando o campo "errorId".`,
      context: {
        feature: feature,
      },
    });
  }
}

function validateInput(input) {
  if (!input) {
    throw new ValidationError({
      message: `Nenhum "input" foi especificado para a ação de filtro.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }
}

function validateOutput(output) {
  if (!output) {
    throw new ValidationError({
      message: `Nenhum "output" foi especificado para a ação de filtro.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }
}

function canRequest(feature) {
  return function (req, res, next) {
    const reqUser = req.context.user;

    if (!reqUser.features.includes(feature)) {
      throw new ForbiddenError({
        message: `Usuário não pode executar esta operação.`,
        action: `Verifique se este usuário possui a feature "${feature}".`,
        errorLocationCode: "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      });
    }

    next();
  };
}

export default {
  can,
  canRequest,
  filterInput,
  filterOutput,
};
