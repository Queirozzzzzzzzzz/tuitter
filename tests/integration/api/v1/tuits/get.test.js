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
    beforeEach(async () => {
      await orchestrator.dropAllTables();
      await orchestrator.runPendingMigrations();
    });

    test("Retrieving tuits and quotes", async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const thirdMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "2 views, 3 likes, 8 retuits, 12 bookmark",
          2,
          3,
          8,
          12,
        );

      await orchestrator.generateTuits(2);

      const firstMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "120 views, 5 likes, 4 retuits, 1 bookmark",
          120,
          15,
          4,
          1,
        );

      await orchestrator.generateTuits(2);

      const secondMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "22 views, 3 likes, 8 retuits, 12 bookmark",
          22,
          5,
          8,
          12,
        );

      const tuitsInDatabase = await db.query("SELECT * FROM tuits;");
      expect(tuitsInDatabase.rows.length).toBe(21);

      const { res, resBody } = await requestBuilder.get();

      expect(res.status).toBe(200);
      expect(resBody.length).toBe(15);
      expect(resBody[0].id).toBe(
        firstMostRelevantTuitCommentQuote.generatedTuit.id,
      );
      expect(resBody[1].id).toBe(
        secondMostRelevantTuitCommentQuote.generatedTuit.id,
      );
      expect(resBody[2].id).toBe(
        thirdMostRelevantTuitCommentQuote.generatedTuit.id,
      );
    });
  });

  describe('User without "read:tuit:list" feature', () => {
    test("Retrieving information", async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      const defaultUser = await requestBuilder.buildUser();
      await orchestrator.removeFeaturesFromUser(defaultUser, [
        "read:tuit:list",
      ]);

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
});
