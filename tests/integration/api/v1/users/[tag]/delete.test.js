import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/users/[tag]", () => {
  describe("Anonymous user", () => {
    test("Deleting other user", async () => {
      const defaultUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${defaultUser.tag}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            ban_type: "nuke",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "ban:user".',
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });

  describe("Default user", () => {
    test("Deleting other user", async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);

      const targetUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },

          body: JSON.stringify({
            ban_type: "nuke",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "ban:user".',
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });

  describe('User with "ban:user" feature', () => {
    test('Without "ban_type" key', async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      await orchestrator.addFeaturesToUser(defaultUser, ["ban:user"]);

      const targetUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },

          body: JSON.stringify({}),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"ban_type" é um campo obrigatório.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(resBody.key).toEqual("ban_type");
      expect(resBody.type).toEqual("any.required");
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });

    test('With "ban_type" with an invalid value', async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      await orchestrator.addFeaturesToUser(defaultUser, ["ban:user"]);

      const targetUser = await orchestrator.createUser();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${targetUser.tag}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },

          body: JSON.stringify({
            ban_type: "invalid-value",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"ban_type" deve possuir um dos seguintes valores: "nuke".',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(resBody.key).toEqual("ban_type");
      expect(resBody.type).toEqual("any.only");
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });

    // TODO - After creating post and rating systems
    test('With "ban_type" with "nuke" value', async () => {
      // 1° Setup users
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      await orchestrator.addFeaturesToUser(defaultUser, ["ban:user"]);

      const targetUser = await orchestrator.createUser();
      const targetUserSession = await orchestrator.createSession(targetUser);

      // Create a post for default user
      // Create a post for target user
      // default user likes, repost and comments in target user post
      // target user likes, repost and comments in default user post
      // get default user post likes, reposts and comments
      // ban target user
      // check if target user is banned
      // check if likes == 0, reposts == 0, comments == 0, disabledReposts == 1, disabledComments == 1
    });

    test('With "ban_type" on a non-existing user', async () => {
      const defaultUser = await orchestrator.createUser();
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      await orchestrator.addFeaturesToUser(defaultUser, ["ban:user"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/donotexist`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${defaultUserSession.token}`,
          },

          body: JSON.stringify({
            ban_type: "nuke",
          }),
        },
      );

      const resBody = await res.json();

      expect(res.status).toEqual(404);
      expect(resBody.status_code).toEqual(404);
      expect(resBody.name).toEqual("NotFoundError");
      expect(resBody.message).toEqual(
        "O usuário informado não foi encontrado no sistema.",
      );
      expect(resBody.action).toEqual(
        `Verifique se o "username" está digitado corretamente.`,
      );
      expect(resBody.status_code).toEqual(404);
      expect(resBody.error_location_code).toEqual(
        "MODEL:USER:FIND_BY_TAG:NOT_FOUND",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.key).toEqual("tag");
    });

    // TODO - After creating post and rating systems
    /* test('With "ban_type" on an user with "nuked" feature', async () => {}); */
  });
});
