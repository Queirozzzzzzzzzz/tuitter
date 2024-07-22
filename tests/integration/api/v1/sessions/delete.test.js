import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test(`With no "session_id" cookie`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "DELETE",
      });

      const resBody = await res.json();

      expect(res.status).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "read:session".',
      );
      expect(resBody.status_code).toEqual(403);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });

  describe("Default user", () => {
    test("With valid session and necessary features", async () => {
      const defaultUser = await orchestrator.createUser();
      const sessionObj = await orchestrator.createSession(defaultUser);

      // 1°: Check if session is working
      const validSessionRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/user`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${sessionObj.token}`,
          },
        },
      );

      const validSessionResBody = await validSessionRes.json();

      expect(validSessionRes.status).toBe(200);
      expect(validSessionResBody.id).toBe(defaultUser.id);

      // 2°: Delete the session
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          cookie: `session_id=${sessionObj.token}`,
        },
      });

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toEqual(sessionObj.id);
      expect(resBody.created_at).toEqual(sessionObj.created_at.toISOString());
      expect(resBody.expires_at < sessionObj.created_at.toISOString()).toEqual(
        true,
      );
      expect(resBody.updated_at > sessionObj.updated_at.toISOString()).toEqual(
        true,
      );

      // 3°: Check if session isn't working anymore
      const invalidSessionRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/user`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${sessionObj.token}`,
          },
        },
      );

      expect(invalidSessionRes.status).toBe(401);
    });

    test(`Without "read:session" feature.`, async () => {
      const defaultUser = await orchestrator.createUser();
      const sessionObj = await orchestrator.createSession(defaultUser);
      await orchestrator.removeFeaturesFromUser(defaultUser, ["read:session"]);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          cookie: `session_id=${sessionObj.token}`,
        },
      });

      const resBody = await res.json();

      expect(res.status).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        "Verifique se este usuário possui a conta ativada.",
      );
      expect(resBody.status_code).toEqual(403);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHENTICATION:INJECT_AUTHENTICATED_USER:USER_CANT_READ_SESSION",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });
});
