import { version as uuidVersion } from "uuid";

import session from "models/session";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("Using a valid email and password", async () => {
      const defaultUser = await orchestrator.createUser();

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.token.length).toEqual(96);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(Date.parse(resBody.expires_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const sessionObjectInDatabase = await session.findById(resBody.id);
      expect(sessionObjectInDatabase.user_id).toEqual(defaultUser.id);

      const parsedCookies = orchestrator.parseSetCookies(res);
      expect(parsedCookies.session_id.name).toEqual("session_id");
      expect(parsedCookies.session_id.value).toEqual(resBody.token);
      expect(parsedCookies.session_id.maxAge).toEqual(60 * 60 * 24 * 30);
      expect(parsedCookies.session_id.path).toEqual("/");
      expect(parsedCookies.session_id.httpOnly).toEqual(true);
    });

    test(`Using a valid email and password, but without the feature "create:session"`, async () => {
      const defaultUser = await orchestrator.createUser({
        tag: "validusernocreatesession",
        username: "Valid User No Create Session",
        email: "validusernocreatesession@email.com",
      });
      await orchestrator.removeFeaturesFromUser(defaultUser, [
        "create:session",
      ]);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validusernocreatesession@email.com",
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Você não possui permissão para fazer login.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "create:session".',
      );
      expect(resBody.status_code).toEqual(403);
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "CONTROLLER:SESSIONS:POST_HANDLER:CAN_NOT_CREATE_SESSION",
      );
    });

    test(`Using a valid password, but numeric email`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: 1234,
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"email" deve ser do tipo String.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("email");
    });

    test(`Using a valid password, but wrong email`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "wronguseremail@email.com",
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(401);
      expect(resBody.name).toEqual("UnauthorizedError");
      expect(resBody.message).toEqual("Dados não conferem.");
      expect(resBody.action).toEqual(
        "Verifique se os dados enviados estão corretos.",
      );
      expect(resBody.status_code).toEqual(401);
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "CONTROLLER:SESSIONS:POST_HANDLER:DATA_MISMATCH",
      );
    });

    test(`Using a valid password, but without email`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"email" é um campo obrigatório.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("email");
    });

    test(`Using a valid password, but empty email`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "",
          password: "validuserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"email" não pode estar em branco.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("email");
    });

    test(`Using a valid email, but wrong password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password: "wronguserpassword",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(401);
      expect(resBody.name).toEqual("UnauthorizedError");
      expect(resBody.message).toEqual("Dados não conferem.");
      expect(resBody.action).toEqual(
        "Verifique se os dados enviados estão corretos.",
      );
      expect(resBody.status_code).toEqual(401);
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "CONTROLLER:SESSIONS:POST_HANDLER:DATA_MISMATCH",
      );
    });

    test(`Using a valid email, but without password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"password" é um campo obrigatório.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("password");
    });

    test(`Using a valid email, but empty password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password: "",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"password" não pode estar em branco.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("password");
    });

    test(`Using a valid email, but small password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password: "small",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"password" deve conter no mínimo 8 caracteres.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("password");
    });

    test(`Using a valid email, but big password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password:
            "73characterssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"password" deve conter no máximo 72 caracteres.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("password");
    });

    test(`Using a valid email, but numeric password`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "validuseremail@email.com",
          password: 12345678,
        }),
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"password" deve ser do tipo String.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("password");
    });

    test("Sending a blank body", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "POST",
      });

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" enviado deve ser do tipo Object.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toBe("MODEL:VALIDATOR:FINAL_SCHEMA");
      expect(resBody.key).toBe("object");
    });
  });
});
