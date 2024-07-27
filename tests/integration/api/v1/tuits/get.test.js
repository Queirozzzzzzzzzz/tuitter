import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import RequestBuilder from "tests/requestBuilder";
import db from "infra/database";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/tuits", () => {
  describe("Anonymous user", () => {
    test("Retrieving information", async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");

      const { res, resBody } = await requestBuilder.get();
      expect(res.status).toBe(403);
      expect(resBody.status_code).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "read:tuit:list".',
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
    });
  });

  describe("Default user", () => {
    test("Retrieving information", async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      await orchestrator.generateTuits(4);

      /* const firstMostRelevantTuit = await orchestrator.generateTuitCommentQuote(
        "120 views, 5 likes, 4 retuits, 1 bookmark",
        120,
        15,
        4,
        1,
      );

      const thirdMostRelevantTuit = await orchestrator.generateTuitCommentQuote(
        "2 views, 3 likes, 8 retuits, 12 bookmark",
        2,
        3,
        8,
        12,
      );

      const secondMostRelevantTuit =
        await orchestrator.generateTuitCommentQuote(
          "2 views, 3 likes, 8 retuits, 12 bookmark",
          22,
          5,
          8,
          12,
        );

      const tuits = await db.query("SELECT * FROM tuits;");
      expect(tuits.rows.length).toBe(21); */

      const { res, resBody } = await requestBuilder.get();
      console.log(resBody);
    });
  });

  describe('User without "read:tuit:list" feature', () => {
    test("Retrieving information", async () => {});
  });
});
