import nextConnect from "next-connect";

import controller from "models/controller";
import authentication from "models/authentication";
import authorization from "models/authorization";
import validator from "models/validator";
import { ForbiddenError } from "errors";
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
  .post(
    postValidationHandler,
    authorization.canRequest("create:tuit:feedback"),
    postHandler,
  );

async function postValidationHandler(req, res, next) {
  const cleanQueryValues = validator(req.query, {
    tuit_id: "required",
  });

  req.query = cleanQueryValues;

  const cleanBodyValues = validator(req.body, {
    feedback_type: "required",
  });

  req.body = cleanBodyValues;

  next();
}

async function postHandler(req, res) {
  const reqUser = req.context.user;
  const insecureInputValues = req.body;

  if (!authorization.can(reqUser, "create:tuit:feedback")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para avaliar tuits.",
      action: 'Verifique se você possui a feature "create:tuit:feedback".',
      errorLocationCode:
        "CONTROLLER:TUIT:FEEDBACK:POST_HANDLER:CREATE:TUIT:FEEDBACK:TEXT_CHILD:FEATURE_NOT_FOUND",
    });
  }

  let secureInputValues = authorization.filterInput(
    reqUser,
    "create:tuit:feedback",
    insecureInputValues,
  );

  secureInputValues.owner_id = reqUser.id;

  const queryFunctionMap = {
    view: tuit.view,
    like: tuit.like,
    retuit: tuit.retuit,
    bookmark: tuit.bookmark,
  };

  const feedback = await runTransaction(
    queryFunctionMap[insecureInputValues.feedback_type],
    reqUser.id,
    req.query.tuit_id,
  );

  return res.status(201).json(feedback);
}

async function runTransaction(queryFunction, ...args) {
  const transaction = await db.transaction();
  try {
    await transaction.query("BEGIN");

    const result = await queryFunction(...args, { transaction });

    await transaction.query("COMMIT");
    return result;
  } catch (err) {
    await transaction.query("ROLLBACK");
    throw err;
  } finally {
    await transaction.release();
  }
}
