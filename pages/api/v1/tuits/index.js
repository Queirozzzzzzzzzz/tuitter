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
  .get(
    getValidationHandler,
    authorization.canRequest("read:tuit:list"),
    getHandler,
  )
  .post(
    postValidationHandler,
    authorization.canRequest("create:tuit"),
    postHandler,
  );

async function getValidationHandler(req, res, next) {
  const cleanValues = validator(
    { ...req.query, ignore: "ignore" },
    {
      ignore: "ignore",
      parent_id: "optional",
    },
  );

  req.query = cleanValues;
  delete req.query.ignore;

  next();
}

async function getHandler(req, res) {
  // TODO - Return list of 15 most relevant tuits from the last 50 tuits that were not viewed by user
}

async function postValidationHandler(req, res, next) {
  const cleanValues = validator(req.body, {
    parent_id: "optional",
    quote_id: "optional",
    body: "required",
  });

  req.body = cleanValues;

  next();
}

async function postHandler(req, res) {
  const reqUser = req.context.user;
  const insecureInputValues = req.body;

  if (!authorization.can(reqUser, "create:tuit")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para criar tuits.",
      action: 'Verifique se você possui a feature "create:tuit".',
      errorLocationCode:
        "CONTROLLER:TUIT:POST_HANDLER:CREATE:TUIT:TEXT_CHILD:FEATURE_NOT_FOUND",
    });
  }

  let secureInputValues = authorization.filterInput(
    reqUser,
    "create:tuit",
    insecureInputValues,
  );

  secureInputValues.owner_id = reqUser.id;

  const transaction = await db.transaction();

  try {
    await transaction.query("BEGIN");

    const createdTuit = await tuit.create(secureInputValues, {
      transaction: transaction,
    });

    await transaction.query("COMMIT");

    const secureOutputValues = authorization.filterOutput(
      reqUser,
      "read:tuit",
      createdTuit,
    );

    res.status(201).json(secureOutputValues);
  } catch (err) {
    await transaction.query("ROLLBACK");

    throw err;
  } finally {
    await transaction.release();
  }
}
