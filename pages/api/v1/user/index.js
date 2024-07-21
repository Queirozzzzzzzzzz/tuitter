import nextConnect from "next-connect";

import session from "models/session";
import authentication from "models/authentication";
import controller from "models/controller";
import authorization from "models/authorization";
import db from "infra/database";

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestMetadata)
  .use(authentication.injectUser)
  .use(controller.logRequest)
  .get(
    authorization.canRequest("read:session"),
    renewSessionIfNecessary,
    getHandler,
  );

async function getHandler(req, res) {
  const authenticatedUser = req.context.user;

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:user:self",
    authenticatedUser,
  );

  return res.status(200).json(secureOutputValues);
}

async function renewSessionIfNecessary(req, res, next) {
  let sessionObject = req.context.session;

  // <3 weeks
  if (
    new Date(sessionObject?.expires_at) <
    Date.now() + 1000 * 60 * 60 * 24 * 7 * 3
  ) {
    sessionObject = await session.renew(sessionObject.id, res);

    req.context.session = sessionObject;
  }

  return next();
}
