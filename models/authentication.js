import { UnauthorizedError, ForbiddenError } from "errors";
import password from "models/password.js";
import validator from "models/validator";
import session from "models/session";
import user from "models/user";
import authorization from "models/authorization";

async function hashPassword(unhashedPassword) {
  return await password.hash(unhashedPassword);
}

async function comparePasswords(providedPassword, passwordHash) {
  const passwordMatches = await password.compare(
    providedPassword,
    passwordHash,
  );

  if (!passwordMatches) {
    throw new UnauthorizedError({
      message: `A senha informada não confere com a senha do usuário.`,
      action: `Verifique se a senha informada está correta e tente novamente.`,
      errorLocationCode:
        "MODEL:AUTHENTICATION:COMPARE_PASSWORDS:PASSWORD_MISMATCH",
    });
  }
}

async function injectUser(req, res, next) {
  if (req.cookies?.session_id) {
    const cleanCookies = validator(req.cookies, {
      session_id: "required",
    });
    req.cookies.session_id = cleanCookies.session_id;

    await injectAuthenticatedUser(req);
  } else {
    const anonymousUser = user.createAnonymous();

    req.context = {
      ...req.context,
      user: anonymousUser,
    };
  }
  return next();
}

async function injectAuthenticatedUser(req) {
  const sessionObj = await session.findByCookies(req.cookies);
  const userObj = await user.findById(sessionObj.user_id);

  if (!authorization.can(userObj, "read:session")) {
    throw new ForbiddenError({
      message: `Usuário não pode executar esta operação.`,
      action: `Verifique se este usuário possui a conta ativada.`,
      errorLocationCode:
        "MODEL:AUTHENTICATION:INJECT_AUTHENTICATED_USER:USER_CANT_READ_SESSION",
    });
  }

  req.context = {
    ...req.context,
    user: userObj,
    session: sessionObj,
  };
}

async function createSessionAndSetCookies(userId, res) {
  const sessionObj = await session.create(userId);
  session.setSessionCookie(sessionObj.token, res);

  return sessionObj;
}

export default {
  hashPassword,
  comparePasswords,
  injectUser,
  createSessionAndSetCookies,
};
