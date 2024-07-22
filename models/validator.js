import Joi from "joi";

import { ValidationError } from "errors";
import webserver from "infra/webserver";

const MAX_INTEGER = 2147483647;
const MIN_INTEGER = -2147483648;

const cachedSchemas = {};

const defaultSchema = Joi.object()
  .label("body")
  .required()
  .min(1)
  .messages({
    "any.invalid": '{#label} possui o valor inválido "{#value}".',
    "any.only": "{#label} deve possuir um dos seguintes valores: {#valids}.",
    "any.required": "{#label} é um campo obrigatório.",
    "array.base": "{#label} deve ser do tipo Array.",
    "boolean.base": "{#label} deve ser do tipo Boolean.",
    "date.base": "{#label} deve conter uma data válida.",
    "markdown.empty": "Markdown deve conter algum texto.",
    "number.base": "{#label} deve ser do tipo Number.",
    "number.integer": "{#label} deve ser um Inteiro.",
    "number.max": "{#label} deve possuir um valor máximo de {#limit}.",
    "number.min": "{#label} deve possuir um valor mínimo de {#limit}.",
    "number.unsafe": `{#label} deve possuir um valor entre ${MIN_INTEGER} e ${MAX_INTEGER}.`,
    "object.base": "{#label} enviado deve ser do tipo Object.",
    "object.min": "Objeto enviado deve ter no mínimo uma chave.",
    "string.alphanum": "{#label} deve conter apenas caracteres alfanuméricos.",
    "string.base": "{#label} deve ser do tipo String.",
    "string.email": "{#label} deve conter um email válido.",
    "string.empty": "{#label} não pode estar em branco.",
    "string.length":
      '{#label} deve possuir {#limit} {if(#limit==1, "caractere", "caracteres")}.',
    "string.ip": "{#label} deve possuir um IP válido.",
    "string.guid": "{#label} deve possuir um token UUID na versão 4.",
    "string.max":
      '{#label} deve conter no máximo {#limit} {if(#limit==1, "caractere", "caracteres")}.',
    "string.min":
      '{#label} deve conter no mínimo {#limit} {if(#limit==1, "caractere", "caracteres")}.',
    "tag.reserved": "Esta tag de usuário não está disponível para uso.",
    "username.reserved": "Este nome de usuário não está disponível para uso.",
    "string.pattern.base": "{#label} está no formato errado.",
  });

export default function validator(obj, keys) {
  try {
    obj = JSON.parse(JSON.stringify(obj));
  } catch (err) {
    throw new ValidationError({
      message: "Não foi possível interpretar o valor enviado.",
      action: "Verifique se o valor enviado é um JSON válido.",
      errorLocationCode: "MODEL:VALIDATOR:ERROR_PARSING_JSON",
      stack: new Error().stack,
      key: "object",
    });
  }

  const keysString = Object.keys(keys).join(",");

  if (!cachedSchemas[keysString]) {
    let finalSchema = defaultSchema;

    for (const key of Object.keys(keys)) {
      const keyValidationFunction = schemas[key];
      finalSchema = finalSchema.concat(keyValidationFunction());
    }
    cachedSchemas[keysString] = finalSchema;
  }

  const { error: err, value } = cachedSchemas[keysString].validate(obj, {
    stripUnknown: true,
    context: {
      required: keys,
    },
    errors: {
      escapeHtml: true,
      wrap: {
        array: false,
        string: '"',
      },
    },
  });

  if (err) {
    throw new ValidationError({
      message: err.details[0].message,
      key:
        err.details[0].context.key || err.details[0].context.type || "object",
      errorLocationCode: "MODEL:VALIDATOR:FINAL_SCHEMA",
      stack: new Error().stack,
      type: err.details[0].type,
    });
  }

  return value;
}

const schemas = {
  tag: function () {
    return Joi.object({
      tag: Joi.string()
        .alphanum()
        .min(1)
        .max(30)
        .trim()
        .custom(checkReservedTags, "check if tag is reserved")
        .when("$required.tag", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  username: function () {
    return Joi.object({
      username: Joi.string()
        .pattern(/^[a-zA-Z0-9\u00C0-\u017F ]+$/)
        .min(1)
        .max(30)
        .trim()
        .custom(checkReservedUsernames, "check if username is reserved")
        .when("$required.username", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  email: function () {
    return Joi.object({
      email: Joi.string()
        .email()
        .min(7)
        .max(254)
        .lowercase()
        .trim()
        .when("$required.email", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  password: function () {
    return Joi.object({
      password: Joi.string().min(8).max(72).trim().when("$required.password", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    });
  },

  token_id: function () {
    return Joi.object({
      token_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.token_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  session_id: function () {
    return Joi.object({
      session_id: Joi.string()
        .length(96)
        .alphanum()
        .when("$required.session_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  body: function () {
    return Joi.object({
      body: Joi.string()
        .pattern(
          /^(\s|\p{C}|\u2800|\u034f|\u115f|\u1160|\u17b4|\u17b5|\u3164|\uffa0).*$/su,
          { invert: true },
        )
        .replace(
          /(\s|\p{C}|\u2800|\u034f|\u115f|\u1160|\u17b4|\u17b5|\u3164|\uffa0)+$|\u0000/gsu,
          "",
        )
        .min(1)
        .max(255)
        .when("$required.body", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        })
        .messages({
          "string.pattern.invert.base": `{#label} deve começar com caracteres visíveis.`,
        }),
    });
  },

  description: function () {
    return Joi.object({
      description: Joi.string()
        .replace(
          /(\s|\p{C}|\u2800|\u034f|\u115f|\u1160|\u17b4|\u17b5|\u3164|\uffa0)+$|\u0000/gsu,
          "",
        )
        .max(160)
        .allow("")
        .when("$required.description", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  picture: function () {
    return Joi.object({
      picture: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .when("$required.picture", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    });
  },

  ban_type: function () {
    return Joi.object({
      ban_type: Joi.string().trim().valid("nuke").when("$required.ban_type", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    });
  },

  owner_id: function () {
    return Joi.object({
      owner_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.owner_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    });
  },

  parent_id: function () {
    return Joi.object({
      parent_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.parent_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    });
  },

  quote_id: function () {
    return Joi.object({
      quote_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.quote_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    });
  },
};

function checkReservedTags(tag, helpers) {
  if (
    (webserver.isServerlessRuntime &&
      reservedDevUsernames.includes(tag.toLowerCase())) ||
    reservedUsernames.includes(tag.toLowerCase()) ||
    reservedUsernamesStartingWith.find((reserved) =>
      tag.toLowerCase().startsWith(reserved),
    )
  ) {
    return helpers.error("tag.reserved");
  }
  return tag;
}

function checkReservedUsernames(username, helpers) {
  if (
    (webserver.isServerlessRuntime &&
      reservedDevUsernames.includes(username.toLowerCase())) ||
    reservedUsernames.includes(username.toLowerCase()) ||
    reservedUsernamesStartingWith.find((reserved) =>
      username.toLowerCase().startsWith(reserved),
    )
  ) {
    return helpers.error("username.reserved");
  }
  return username;
}

const reservedDevUsernames = ["admin", "user"];
const reservedUsernamesStartingWith = ["favicon", "manifest"];
const reservedUsernames = [
  "account",
  "administracao",
  "administrador",
  "administradora",
  "administradores",
  "administrator",
  "afiliado",
  "afiliados",
  "ajuda",
  "alerta",
  "alertas",
  "all",
  "analytics",
  "anonymous",
  "anunciar",
  "anuncie",
  "anuncio",
  "anuncios",
  "api",
  "app",
  "apps",
  "autenticacao",
  "auth",
  "authentication",
  "autorizacao",
  "avatar",
  "backup",
  "banner",
  "banners",
  "beta",
  "blog",
  "cadastrar",
  "cadastro",
  "carrinho",
  "categoria",
  "categorias",
  "categories",
  "category",
  "ceo",
  "cfo",
  "checkout",
  "classificados",
  "comentario",
  "comentarios",
  "compartilhada",
  "compartilhadas",
  "compartilhado",
  "compartilhados",
  "comunidade",
  "comunidades",
  "config",
  "configuracao",
  "configuracoes",
  "configurar",
  "configure",
  "conta",
  "contas",
  "contato",
  "contatos",
  "content",
  "conteudos",
  "contrato",
  "convite",
  "convites",
  "create",
  "criar",
  "css",
  "cto",
  "cultura",
  "curso",
  "cursos",
  "dados",
  "dashboard",
  "desconectar",
  "descricao",
  "description",
  "deslogar",
  "diretrizes",
  "discussao",
  "docs",
  "documentacao",
  "download",
  "downloads",
  "draft",
  "edit",
  "editar",
  "editor",
  "email",
  "estatisticas",
  "eu",
  "faq",
  "features",
  "gerente",
  "grupo",
  "grupos",
  "guest",
  "guidelines",
  "hoje",
  "imagem",
  "imagens",
  "init",
  "interface",
  "licenca",
  "log",
  "login",
  "logout",
  "loja",
  "me",
  "membership",
  "moderacao",
  "moderador",
  "moderadora",
  "moderadoras",
  "moderadores",
  "museu",
  "news",
  "newsletter",
  "newsletters",
  "notificacoes",
  "notification",
  "notifications",
  "ontem",
  "pagina",
  "password",
  "patrocinada",
  "patrocinadas",
  "patrocinado",
  "patrocinados",
  "perfil",
  "pesquisa",
  "popular",
  "tuit",
  "tuitar",
  "tuits",
  "post",
  "postar",
  "posts",
  "preferencias",
  "promoted",
  "promovida",
  "promovidas",
  "promovido",
  "promovidos",
  "public",
  "publicar",
  "publish",
  "rascunho",
  "recentes",
  "register",
  "registration",
  "regras",
  "relatorio",
  "relatorios",
  "replies",
  "reply",
  "resetar-senha",
  "resetar",
  "resposta",
  "respostas",
  "root",
  "rootuser",
  "rss",
  "sair",
  "senha",
  "sobre",
  "sponsored",
  "status",
  "sudo",
  "superuser",
  "suporte",
  "support",
  "swr",
  "sysadmin",
  "tabnew",
  "tabnews",
  "tag",
  "tags",
  "termos-de-uso",
  "termos",
  "terms",
  "toc",
  "todos",
  "trending",
  "upgrade",
  "username",
  "users",
  "usuario",
  "usuarios",
  "va",
  "vagas",
  "videos",
  "picture",
];
