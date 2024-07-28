import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import RequestBuilder from "tests/requestBuilder";
import tuit from "models/tuit";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/tuits/[id]", () => {
  describe("Anonymous user", () => {
    test("Retrieving tuit", async () => {
      const tuit = await orchestrator.createTuit();
      const requestBuilder = new RequestBuilder(`/api/v1/tuits/${tuit.id}`);
      const { res, resBody } = await requestBuilder.get();

      expect(res.status).toBe(200);
      expect(resBody.id).toEqual(tuit.id);
      expect(resBody.owner_id).toEqual(tuit.owner_id);
      expect(resBody.parent_id).toEqual(tuit.parent_id);
      expect(resBody.quote_id).toEqual(tuit.quote_id);
      expect(resBody.body).toEqual(tuit.body);
      expect(resBody.status).toEqual(tuit.status);
      expect(resBody.views).toEqual(tuit.views);
      expect(resBody.likes).toEqual(tuit.likes);
      expect(resBody.retuits).toEqual(tuit.retuits);
      expect(resBody.bookmarks).toEqual(tuit.bookmarks);
      expect(resBody.comments).toEqual(tuit.comments);
      expect(resBody.quotes).toEqual(tuit.quotes);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);
    });
  });
});
