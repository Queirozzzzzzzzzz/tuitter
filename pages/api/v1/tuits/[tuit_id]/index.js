import nextConnect from "next-connect";

import controller from "models/controller";
import authentication from "models/authentication";
import authorization from "models/authorization";
import validator from "models/validator";
import { ForbiddenError, UnprocessableEntityError } from "errors";
import db from "infra/database";
import tuit from "models/tuit";

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestMetadata)
  .use(authentication.injectUser)
  .use(controller.logRequest)
  .delete(
    deleteValidationHandler,
    authorization.canRequest("update:tuit"),
    deleteHandler,
  );

async function deleteValidationHandler(req, res, next) {
  const cleanQueryValues = validator(req.query, {
    tuit_id: "required",
  });

  req.query = cleanQueryValues;

  next();
}

async function deleteHandler(req, res) {
  const reqUser = req.context.user;
  const targetTuit = await tuit.findById(req.query.tuit_id);

  if (targetTuit.status === "disabled") {
    throw new UnprocessableEntityError({
      message: "Este tuit já está desabilitado.",
      action: "Verifique se você está tentando desabilitar o tuit correto.",
      errorLocationCode:
        "CONTROLLER:TUITS:TUIT_ID:DELETE:TUIT_ALREADY_DISABLED",
    });
  }

  if (!authorization.can(reqUser, "update:tuit", targetTuit)) {
    throw new ForbiddenError({
      message:
        "Você não possui permissão para atualizar o tuit de outro usuário.",
      action: 'Verifique se você possui a feature "update:tuit:others".',
      errorLocationCode:
        "CONTROLLER:TUITS:PATCH:USER_CANT_UPDATE_TUIT_FROM_OTHER_USER",
    });
  }

  const transaction = await db.transaction();
  let disabledTuit;
  try {
    await transaction.query("BEGIN");

    disabledTuit = await tuit.disable(targetTuit.id);

    await transaction.query("COMMIT");
  } catch (err) {
    await transaction.query("ROLLBACK");
    throw err;
  } finally {
    await transaction.release();
  }

  const secureOutputValues = authorization.filterOutput(
    reqUser,
    "read:tuit",
    disabledTuit,
  );

  return res.status(200).json(secureOutputValues);
}
