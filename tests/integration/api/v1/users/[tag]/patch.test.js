import { version as uuidVersion } from "uuid";

import password from "models/password.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[tag]", () => {
  describe("Anonymous user", () => {
    test("Patching other user", async () => {
      const defaultUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "anonymoususerpatchingotheruser",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "update:user".',
      );
      expect(resBody.status_code).toEqual(403);
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
    });
  });

  describe("Default user", () => {
    test("Patching other user", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      const targetUser = await orchestrator.createUser({
        tag: "uniqueusertag",
        username: "uniqueuserusername",
        email: "uniqueuseremail@email.com",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            username: "defaultuserpatchingotheruser",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Você não possui permissão para atualizar outro usuário.",
      );
      expect(resBody.action).toEqual(
        'Verifique se você possui a feature "update:user:others".',
      );
      expect(resBody.status_code).toEqual(403);
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "CONTROLLER:USERS:TAG:PATCH:USER_CANT_UPDATE_OTHER_USER",
      );
    });

    test("Patching itself with a valid and unique values", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const newValues = {
        username: "validanduniqueusername",
        email: "validanduniqueemail@email.com",
        password: "validanduniquepassword",
        description: "Valid description",
        picture: "http://localhost:3000/images/test.webp",
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            username: newValues.username,
            email: newValues.email,
            password: newValues.password,
            description: newValues.description,
            picture: newValues.picture,
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(200);
      expect(resBody.id).toEqual(defaultUser.id);
      expect(resBody.tag).toEqual(defaultUser.tag);
      expect(resBody.username).toEqual(newValues.username);
      expect(resBody.email).toEqual(newValues.email);
      expect(resBody.description).toEqual(newValues.description);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(new Date(resBody.created_at)).toEqual(
        new Date(defaultUser.created_at),
      );
      expect(resBody.updated_at > defaultUser.created_at.toISOString()).toBe(
        true,
      );

      const defaultUserInDatabase = await user.findById(resBody.id);
      const passwordsMatch = await password.compare(
        newValues.password,
        defaultUserInDatabase.password,
      );
      expect(passwordsMatch).toBe(true);
      expect(defaultUserInDatabase.picture).toEqual(newValues.picture);
    });

    test("Patching itself with a valid but non unique username", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const newValues = {
        username: "uniqueuserusername",
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            username: newValues.username,
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        'O "username" informado já está sendo usado.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:USER:VALIDATE_UNIQUE_USERNAME:ALREADY_EXISTS",
      );
      expect(resBody.key).toEqual("username");
    });

    test("Patching itself with a valid but non unique email", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const newValues = {
        email: "uniqueuseremail@email.com",
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            email: newValues.email,
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        'O "email" informado já está sendo usado.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:USER:VALIDATE_UNIQUE_EMAIL:ALREADY_EXISTS",
      );
      expect(resBody.key).toEqual("email");
    });

    test(`Patching itself with "username" in blocked list`, async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            username: "administrator",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        "Este nome de usuário não está disponível para uso.",
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.key).toEqual("username");
    });

    test(`Patching itself with "description" longer than 160 characters`, async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
          body: JSON.stringify({
            description: "a".repeat(161),
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        `"description" deve conter no máximo 160 caracteres.`,
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.key).toEqual("description");
    });

    test("Patching itself with an empty body", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        "Objeto enviado deve ter no mínimo uma chave.",
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.key).toEqual("object");
    });
  });

  describe('User with "update:user:others" feature', () => {
    test("Patching other user only with fields that cannot be updated", async () => {
      const privilegedUser = await orchestrator.createUser();
      await orchestrator.addFeaturesToUser(privilegedUser, [
        "update:user:others",
      ]);
      const privilegedUserSession =
        await orchestrator.createSession(privilegedUser);

      const targetUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${privilegedUserSession.token}`,
          },

          body: JSON.stringify({
            tag: "validnewtag",
            username: "validnewusername",
            email: "validnewemail@email.com",
            password: "validnewpassword",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        "Objeto enviado deve ter no mínimo uma chave.",
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.key).toEqual("object");
    });

    test("Patching other user with all fields", async () => {
      const privilegedUser = await orchestrator.createUser();
      await orchestrator.addFeaturesToUser(privilegedUser, [
        "update:user:others",
      ]);
      const privilegedUserSession =
        await orchestrator.createSession(privilegedUser);

      const targetUser = await orchestrator.createUser({
        password: "validinitialpassword",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.tag}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${privilegedUserSession.token}`,
          },

          body: JSON.stringify({
            tag: "validnewtag",
            username: "validnewusername",
            email: "validnewemail@email.com",
            password: "validnewpassword",
            description: "Valid new description.",
            picture: "http://validnewpicture/picture.webp",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(200);
      expect(resBody.tag).toEqual(targetUser.tag);
      expect(resBody.username).toEqual(targetUser.username);
      expect(resBody.features).toEqual(targetUser.features);
      expect(resBody.description).toEqual("Valid new description.");
      expect(resBody.created_at).toEqual(targetUser.created_at.toISOString());

      const targetUserInDatabase = await user.findById(targetUser.id);
      expect(targetUserInDatabase.email).toBe(targetUser.email);

      const passwordsMatch = await password.compare(
        "validinitialpassword",
        targetUserInDatabase.password,
      );
      const wrongPasswordMatch = await password.compare(
        "validnewpassword",
        targetUserInDatabase.password,
      );
      expect(passwordsMatch).toBe(true);
      expect(wrongPasswordMatch).toBe(false);
    });
  });
});
