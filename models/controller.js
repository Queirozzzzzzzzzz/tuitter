import { randomUUID as uuidV4 } from "node:crypto";
import snakeize from "snakeize";

import {
  ForbiddenError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
  ValidationError,
} from "errors";
import logger from "infra/logger.js";
import ip from "models/ip.js";
import session from "models/session.js";

async function injectRequestMetadata(req, res, next) {
  req.context = {
    ...req.context,
    requestId: uuidV4(),
    clientIp: ip.extractFromRequest(req),
  };

  if (next) {
    next();
  }
}

async function onNoMatchHandler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  injectRequestMetadata(req);
  const publicErrorObject = new MethodNotAllowedError({
    message: `Método "${req.method}" não permitido para "${req.url}".`,
    action: "Utilize um método HTTP válido para este recurso.",
    requestId: req.context?.requestId || uuidV4(),
  });

  const privateErrorObject = {
    ...publicErrorObject,
    context: { ...req.context },
  };
  logger.info(snakeize(privateErrorObject));

  return errorResponse(
    res,
    publicErrorObject.statusCode,
    snakeize(publicErrorObject),
  );
}

function onErrorHandler(err, req, res) {
  if (
    err instanceof ValidationError ||
    err instanceof MethodNotAllowedError ||
    err instanceof NotFoundError ||
    err instanceof ForbiddenError ||
    err instanceof UnprocessableEntityError ||
    err instanceof TooManyRequestsError
  ) {
    const publicErrorObject = {
      ...err,
      requestId: req.context.requestId,
    };

    const privateErrorObject = {
      ...publicErrorObject,
      context: { ...req.context },
    };
    logger.info(snakeize(privateErrorObject));

    return errorResponse(res, err.statusCode, snakeize(publicErrorObject));
  }

  if (err instanceof UnauthorizedError) {
    const publicErrorObject = {
      ...err,
      requestId: req.context.requestId,
    };

    const privateErrorObject = {
      ...publicErrorObject,
      context: { ...req.context },
    };
    logger.info(snakeize(privateErrorObject));

    session.clearSessionCookie(res);

    return errorResponse(res, err.statusCode, snakeize(publicErrorObject));
  }

  const publicErrorObject = new InternalServerError({
    requestId: req.context?.requestId,
    errorId: err.errorId,
    statusCode: err.statusCode,
    errorLocationCode: err.errorLocationCode,
  });

  const privateErrorObject = {
    ...new InternalServerError({
      ...err,
      requestId: req.context?.requestId,
    }),
    context: { ...req.context },
  };

  logger.error(snakeize(privateErrorObject));

  return errorResponse(
    res,
    publicErrorObject.statusCode,
    snakeize(publicErrorObject),
  );
}

function errorResponse(res, statusCode, publicErrorObject) {
  res.status(statusCode);

  const isStream = res.getHeader("Content-Type") === "application/x-ndjson";
  if (isStream) {
    res.write(JSON.stringify(publicErrorObject) + "\n");
    res.end();
  }

  return res.json(publicErrorObject);
}

function logRequest(req, res, next) {
  const { headers, body, context } = req;

  const log = {
    headers: clearHeaders(headers),
    body: clearBody(body),
    context: clearContext(context),
  };

  logger.info(log);

  next();
}

const headersToRedact = ["authorization", "cookie"];
const headerToOmit = [
  "access-control-allow-headers",
  "forwarded",
  "x-vercel-proxy-signature",
  "x-vercel-sc-headers",
];

function clearHeaders(headers) {
  const cleanHeaders = { ...headers };

  headersToRedact.forEach((header) => {
    if (cleanHeaders[header]) {
      cleanHeaders[header] = "**";
    }
  });

  headerToOmit.forEach((header) => {
    delete cleanHeaders[header];
  });

  return [cleanHeaders];
}

const bodyToRedact = ["email", "password"];

function clearBody(requestBody) {
  const cleanBody = { ...requestBody };

  if (typeof cleanBody.body === "string") {
    cleanBody.body = cleanBody.body.substring(0, 300);
  }

  bodyToRedact.forEach((key) => {
    if (cleanBody[key]) {
      cleanBody[key] = "**";
    }
  });

  return [cleanBody];
}

function clearContext(context) {
  const cleanContext = { ...context };

  if (cleanContext.user) {
    cleanContext.user = {
      id: context.user.id,
      username: context.user.username,
    };
  }

  return cleanContext;
}

export default Object.freeze({
  injectRequestMetadata,
  onNoMatchHandler,
  onErrorHandler,
  logRequest,
});
