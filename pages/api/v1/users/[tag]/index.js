import nextConnect from "next-connect";

import { ForbiddenError, UnprocessableEntityError } from "errors";
import authentication from "models/authentication";
import controller from "models/controller";
import authorization from "models/authorization";
import db from "infra/database";
import validator from "models/validator";
import user from "models/user";

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestMetadata)
  .use(controller.logRequest)
  .patch(
    authentication.injectUser,
    patchValidationHandler,
    authorization.canRequest("update:user"),
    patchHandler,
  )
  .delete(
    authentication.injectUser,
    deleteValidationHandler,
    authorization.canRequest("ban:user"),
    deleteHandler,
  );

async function patchValidationHandler(req, res, next) {
  const cleanQueryValues = validator(req.query, {
    tag: "required",
  });

  req.query = cleanQueryValues;

  const cleanBodyValues = validator(req.body, {
    username: "optional",
    email: "optional",
    password: "optional",
    description: "optional",
    picture: "optional",
  });

  req.body = cleanBodyValues;

  next();
}

async function patchHandler(req, res) {
  const reqUser = req.context.user;
  const targetTag = req.query.tag;
  const targetUser = await user.findByTag(targetTag);
  const insecureInputValues = req.body;

  let updateAnotherUser = false;

  if (!authorization.can(reqUser, "update:user", targetUser)) {
    if (!authorization.can(reqUser, "update:user:others")) {
      throw new ForbiddenError({
        message: "Você não possui permissão para atualizar outro usuário.",
        action: 'Verifique se você possui a feature "update:user:others".',
        errorLocationCode:
          "CONTROLLER:USERS:TAG:PATCH:USER_CANT_UPDATE_OTHER_USER",
      });
    }

    updateAnotherUser = true;
  }

  const secureInputValues = authorization.filterInput(
    reqUser,
    updateAnotherUser ? "update:user:others" : "update:user",
    insecureInputValues,
    targetUser,
  );

  const transaction = await db.transaction();
  let updatedUser;

  try {
    await transaction.query("BEGIN");

    updatedUser = await user.update(targetTag, secureInputValues, {
      transaction: transaction,
    });

    await transaction.query("COMMIT");
    await transaction.release();
  } catch (err) {
    await transaction.query("ROLLBACK");
    await transaction.release();

    throw err;
  }

  const secureOutputValues = authorization.filterOutput(
    reqUser,
    updateAnotherUser ? "read:user" : "read:user:self",
    updatedUser,
  );

  return res.status(200).json(secureOutputValues);
}

async function deleteValidationHandler(req, res, next) {
  const cleanQueryValues = validator(req.query, {
    tag: "required",
  });

  req.query = cleanQueryValues;

  const cleanBodyValues = validator(req.body, {
    ban_type: "required",
  });

  req.body = cleanBodyValues;

  next();
}

// TODO - After creating tuit and rating systems
async function deleteHandler(req, res) {
  const reqUser = req.context.user;
  const targetUser = await user.findByTag(req.query.tag);
  const insecureInputValues = req.body;
  const secureInputValues = authorization.filterInput(
    reqUser,
    "ban:user",
    insecureInputValues,
  );

  if (targetUser.features.includes("nuked")) {
    throw new UnprocessableEntityError({
      message: "Este usuário já está banido permanentemente.",
      action:
        "Verifique se você está tentando banir permanentemente o usuário correto.",
      errorLocationCode: "CONTROLLER:USERS:USERNAME:DELETE:USER_ALREADY_NUKED",
    });
  }

  return res.status(200).json({});
}
