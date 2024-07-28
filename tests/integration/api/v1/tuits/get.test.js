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
      const defaultUser = await requestBuilder.buildUser();

      const thirdMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "13 views, 3 likes, 1 retuit, 0 bookmarks",
          13,
          3,
          1,
          0,
        );

      await orchestrator.generateTuits(2);

      const firstMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "25 views, 25 likes, 8 retuits, 4 bookmarks",
          25,
          25,
          8,
          4,
          defaultUser,
        );

      await orchestrator.generateTuits(2);

      const secondMostRelevantTuitCommentQuote =
        await orchestrator.generateTuitCommentQuote(
          "70 views, 20 likes, 4 retuits, 4 bookmarks",
          70,
          20,
          4,
          4,
        );

      const tuitsInDatabase = await db.query("SELECT * FROM tuits;");
      expect(tuitsInDatabase.rows.length).toBe(21);

      const { res, resBody } = await requestBuilder.get();

      expect(res.status).toBe(200);
      expect(resBody.length).toBe(15);

      const firstMostRelevantTuit =
        firstMostRelevantTuitCommentQuote.updatedGeneratedTuit;

      expect(resBody[0].id).toBe(firstMostRelevantTuit.id);
      expect(resBody[0].relevance).toBe(18.4);
      expect(resBody[0].owner_id).toEqual(firstMostRelevantTuit.owner_id);
      expect(resBody[0].parent_id).toEqual(firstMostRelevantTuit.parent_id);
      expect(resBody[0].quote_id).toEqual(firstMostRelevantTuit.quote_id);
      expect(resBody[0].body).toEqual(firstMostRelevantTuit.body);
      expect(resBody[0].status).toEqual(firstMostRelevantTuit.status);
      expect(resBody[0].views).toBe(firstMostRelevantTuit.views);
      expect(resBody[0].likes).toBe(firstMostRelevantTuit.likes);
      expect(resBody[0].retuits).toBe(firstMostRelevantTuit.retuits);
      expect(resBody[0].bookmarks).toBe(firstMostRelevantTuit.bookmarks);
      expect(resBody[0].comments).toBe(firstMostRelevantTuit.comments);
      expect(resBody[0].quotes).toBe(firstMostRelevantTuit.quotes);
      expect(Date.parse(resBody[0].created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody[0].updated_at)).not.toEqual(NaN);
      expect(resBody[0].owner_info.username).toBe(defaultUser.username);
      expect(resBody[0].owner_info.picture).toBe(defaultUser.picture);

      expect(resBody[1].id).toBe(
        secondMostRelevantTuitCommentQuote.updatedGeneratedTuit.id,
      );
      expect(resBody[2].id).toBe(
        thirdMostRelevantTuitCommentQuote.updatedGeneratedTuit.id,
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
