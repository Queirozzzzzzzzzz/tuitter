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
    authorization.canRequest("read:tuit:list"),
    postHandler,
  );

async function postValidationHandler(req, res, next) {
  const cleanValues = validator(
    { ...req.query, ...req.body },
    {
      tuit_id: "required",
      comments_ids: "optional",
    },
  );

  req.query = { tuit_id: cleanValues.tuit_id };
  req.body = {
    comments_ids: cleanValues.comments_ids ? cleanValues.comments_ids : [],
  };

  next();
}

async function postHandler(req, res) {
  const parentId = req.query.tuit_id;
  const commentsIds = req.body.comments_ids;

  const tuits = await tuit.getComments(parentId, commentsIds);

  return res.status(200).json(tuits);
}
