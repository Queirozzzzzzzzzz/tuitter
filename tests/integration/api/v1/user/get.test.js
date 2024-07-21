import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/user", () => {
  describe("Anonymous user", () => {
    test("Retrieving the endpoint", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`);

      const resBody = await res.json();

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        `Verifique se este usuário possui a feature "read:session".`,
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );

      const parsedCookies = orchestrator.parseSetCookies(res);
      expect(parsedCookies).toEqual({});
    });
  });

  describe("Valid user", () => {
    test("With valid session", async () => {
      const defaultUser = await orchestrator.createUser();
      const userSession = await orchestrator.createSession(defaultUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
        headers: {
          cookie: `session_id=${userSession.token}`,
        },
      });

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toEqual(defaultUser.id);
      expect(resBody.tag).toEqual(defaultUser.tag);
      expect(resBody.username).toEqual(defaultUser.username);
      expect(resBody.email).toEqual(defaultUser.email);
      expect(resBody.features).toEqual(defaultUser.features);
      expect(new Date(resBody.created_at)).toEqual(
        new Date(defaultUser.created_at),
      );

      const parsedCookies = orchestrator.parseSetCookies(res);
      expect(parsedCookies).toEqual({});

      const sessionObj = await orchestrator.findSessionByToken(
        userSession.token,
      );
      expect(sessionObj).toEqual(userSession);
    });
  });
});
