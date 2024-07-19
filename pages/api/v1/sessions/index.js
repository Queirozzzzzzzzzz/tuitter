import nextConnect from "next-connect";

import { ForbiddenError, UnauthorizedError } from "errors";
import authentication from "models/authentication";
import authorization from "models/authorization";
import session from "models/session";
import user from "models/user";
import validator from "models/validator";
import controller from "models/controller";

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestMetadata)
  .use(authentication.injectUser)
  .use(controller.logRequest)
  .delete(authorization.canRequest("read:session"), deleteHandler)
  .post(
    postValidationHandler,
    authorization.canRequest("create:session"),
    postHandler,
  );

async function deleteHandler(req, res) {
  const authenticatedUser = req.context.user;
  const sessionObj = req.context.session;

  const expiredSession = await session.expireById(sessionObj.id);
  session.clearSessionCookie(res);

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:session",
    expiredSession,
  );

  return res.status(200).json(secureOutputValues);
}

async function postValidationHandler(req, res, next) {
  const cleanValues = validator(req.body, {
    email: "required",
    password: "required",
  });

  req.body = cleanValues;

  next();
}

async function postHandler(req, res) {
  const reqUser = req.context.user;
  const insecureInputValues = req.body;

  const secureInputValues = authorization.filterInput(
    reqUser,
    "create:session",
    insecureInputValues,
  );

  let storedUser;
  try {
    storedUser = await user.findByEmail(secureInputValues.email);
    await authentication.comparePasswords(
      secureInputValues.password,
      storedUser.password,
    );
  } catch (err) {
    throw new UnauthorizedError({
      message: `Dados não conferem.`,
      action: `Verifique se os dados enviados estão corretos.`,
      errorLocationCode: `CONTROLLER:SESSIONS:POST_HANDLER:DATA_MISMATCH`,
    });
  }

  if (!authorization.can(storedUser, "create:session")) {
    throw new ForbiddenError({
      message: `Você não possui permissão para fazer login.`,
      action: `Verifique se este usuário possui a feature "create:session".`,
      errorLocationCode:
        "CONTROLLER:SESSIONS:POST_HANDLER:CAN_NOT_CREATE_SESSION",
    });
  }

  const sessionObj = await authentication.createSessionAndSetCookies(
    storedUser.id,
    res,
  );

  const secureOutputValues = authorization.filterOutput(
    storedUser,
    "create:session",
    sessionObj,
  );

  return res.status(201).json(secureOutputValues);
}
