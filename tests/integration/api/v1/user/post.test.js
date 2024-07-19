import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/user", () => {
  describe("No user", () => {
    test("With invalid HTTP `method`", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "POST",
      });

      const resBody = await res.json();

      expect(res.status).toEqual(405);
      expect(resBody.name).toEqual("MethodNotAllowedError");
      expect(resBody.message).toEqual(
        'Método "POST" não permitido para "/api/v1/user".',
      );
      expect(resBody.action).toEqual(
        "Utilize um método HTTP válido para este recurso.",
      );
      expect(resBody.status_code).toEqual(405);

      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });
});
