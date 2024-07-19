import nextConnect from "next-connect";

import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import controller from "models/controller.js";
import user from "models/user.js";
import validator from "models/validator.js";

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
    authorization.canRequest("create:user"),
    postHandler,
  );

async function postValidationHandler(req, res, next) {
  const cleanValues = validator(req.body, {
    tag: "required",
    username: "required",
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
    "create:user",
    insecureInputValues,
  );

  let newUser;
  try {
    newUser = await user.create(secureInputValues);
  } catch (err) {
    throw err;
  }

  const secureOutputValues = authorization.filterOutput(
    newUser,
    "read:user",
    newUser,
  );

  return res.status(201).json(secureOutputValues);
}
