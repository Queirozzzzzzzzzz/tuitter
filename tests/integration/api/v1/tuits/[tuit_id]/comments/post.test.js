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
    test("Retrieving comments", async () => {
      const tuit = await orchestrator.createTuit();
      const requestBuilder = new RequestBuilder(
        `/api/v1/tuits/${tuit.id}/comments`,
      );

      const { res, resBody } = await requestBuilder.post();

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
    test("Retrieving comments", async () => {
      const tuit = await orchestrator.createTuit();
      const requestBuilder = new RequestBuilder(
        `/api/v1/tuits/${tuit.id}/comments`,
      );
      await requestBuilder.buildUser();
      await orchestrator.createTuit();
      await orchestrator.generateComments(tuit.id, 15);

      const tuitsInDatabase = await db.query("SELECT * FROM tuits;");
      expect(tuitsInDatabase.rows.length).toBe(17);

      // No comments_ids
      const { res: firstRes, resBody: firstResBody } =
        await requestBuilder.post();

      expect(firstRes.status).toBe(200);
      expect(firstResBody.length).toBe(10);

      let commentsIds = [];

      for (const i in firstResBody) {
        commentsIds.push(firstResBody[i].id);
      }

      // With 10 comments_ids
      const { res: secondRes, resBody: secondResBody } =
        await requestBuilder.post({ comments_ids: commentsIds });

      expect(secondRes.status).toBe(200);
      expect(secondResBody.length).toBe(5);

      for (const i in secondResBody) {
        commentsIds.push(secondResBody[i].id);
      }

      // With 15 comments_ids
      const { res: thirdRes, resBody: thirdResBody } =
        await requestBuilder.post({ comments_ids: commentsIds });

      expect(thirdRes.status).toBe(200);
      expect(thirdResBody.length).toBe(0);
    });
  });
});
