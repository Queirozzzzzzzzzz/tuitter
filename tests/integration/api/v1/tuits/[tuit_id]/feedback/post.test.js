import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import RequestBuilder from "tests/requestBuilder";
import db from "infra/database";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/tuits/[tuit_id]/feedback", () => {
  describe("Anonymous user", () => {
    test("View feedback", async () => {
      const requestBuilder = new RequestBuilder();

      const exampleTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "view",
        },
      );

      expect(res.status).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "create:tuit:feedback".',
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
    test("View feedback", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();
      const oldExampleTuitViews = parseInt(exampleTuit.views);

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "view",
        },
      );

      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);

      const feedbackInDatabase = await db.query({
        text: `SELECT * FROM views WHERE id = $1;`,
        values: [resBody.id],
      });

      const updatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(feedbackInDatabase.rows.length > 0).toBe(true);
      expect(updatedTuit.rows[0].views).toEqual(oldExampleTuitViews + 1);
    });

    test("Duplicated view request", async () => {
      const requestBuilder = new RequestBuilder();
      await requestBuilder.buildUser();
      const exampleTuit = await orchestrator.createTuit();

      await requestBuilder.post(`/api/v1/tuits/${exampleTuit.id}/feedback`, {
        feedback_type: "view",
      });

      const { res: secondRes, resBody: secondResBody } =
        await requestBuilder.post(`/api/v1/tuits/${exampleTuit.id}/feedback`, {
          feedback_type: "view",
        });

      expect(secondRes.status).toBe(201);
      expect(secondResBody).toEqual(null);

      const updatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(updatedTuit.rows[0].views).toEqual(1);
    });

    test("Like feedback", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();
      const oldExampleTuitLikes = parseInt(exampleTuit.likes);

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "like",
        },
      );

      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);

      const feedbackInDatabase = await db.query({
        text: `SELECT * FROM likes WHERE id = $1;`,
        values: [resBody.id],
      });

      const updatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(feedbackInDatabase.rows.length > 0).toBe(true);
      expect(updatedTuit.rows[0].likes).toEqual(oldExampleTuitLikes + 1);
    });

    test("Duplicated like request", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();
      const exampleTuit = await orchestrator.createTuit();

      const { res: firstRes, resBody: firstResBody } =
        await requestBuilder.post(`/api/v1/tuits/${exampleTuit.id}/feedback`, {
          feedback_type: "like",
        });

      expect(firstRes.status).toBe(201);
      expect(firstResBody.owner_id).toEqual(defaultUser.id);
      expect(firstResBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(firstResBody.created_at)).not.toEqual(NaN);

      const firstUpdatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(firstUpdatedTuit.rows[0].likes).toEqual(1);

      const { res: secondRes, resBody: secondResBody } =
        await requestBuilder.post(`/api/v1/tuits/${exampleTuit.id}/feedback`, {
          feedback_type: "like",
        });

      expect(secondRes.status).toBe(201);
      expect(secondResBody.owner_id).toEqual(defaultUser.id);
      expect(secondResBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(secondResBody.created_at)).not.toEqual(NaN);

      const secondUpdatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(secondUpdatedTuit.rows[0].likes).toEqual(0);
    });

    test("Retuit feedback", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();
      const oldExampleTuitRetuits = parseInt(exampleTuit.retuits);

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "retuit",
        },
      );

      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);

      const feedbackInDatabase = await db.query({
        text: `SELECT * FROM retuits WHERE id = $1;`,
        values: [resBody.id],
      });

      const updatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(feedbackInDatabase.rows.length > 0).toBe(true);
      expect(updatedTuit.rows[0].retuits).toEqual(oldExampleTuitRetuits + 1);
    });

    test("Bookmark feedback", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();
      const oldExampleTuitBookmarks = parseInt(exampleTuit.bookmarks);

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "bookmark",
        },
      );

      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.tuit_id).toEqual(exampleTuit.id);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);

      const feedbackInDatabase = await db.query({
        text: `SELECT * FROM bookmarks WHERE id = $1;`,
        values: [resBody.id],
      });

      const updatedTuit = await db.query({
        text: `SELECT * FROM tuits WHERE id = $1;`,
        values: [exampleTuit.id],
      });

      expect(feedbackInDatabase.rows.length > 0).toBe(true);
      expect(updatedTuit.rows[0].bookmarks).toEqual(
        oldExampleTuitBookmarks + 1,
      );
    });

    test("Invalid feedback", async () => {
      const requestBuilder = new RequestBuilder();
      await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "delete",
        },
      );

      expect(res.status).toBe(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"feedback_type" deve possuir um dos seguintes valores: "view", "like", "retuit", "bookmark".',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.status_code).toEqual(400);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });

    test("Empty body", async () => {
      const requestBuilder = new RequestBuilder();
      await requestBuilder.buildUser();

      const exampleTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {},
      );

      expect(res.status).toBe(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        "Objeto enviado deve ter no mínimo uma chave.",
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(resBody.status_code).toEqual(400);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });

  describe('User without "create:tuit:feedback" feature', () => {
    test("View feedback", async () => {
      const requestBuilder = new RequestBuilder();
      const defaultUser = await requestBuilder.buildUser();
      await orchestrator.removeFeaturesFromUser(defaultUser, [
        "create:tuit:feedback",
      ]);

      const exampleTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.post(
        `/api/v1/tuits/${exampleTuit.id}/feedback`,
        {
          feedback_type: "view",
        },
      );

      expect(res.status).toBe(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "create:tuit:feedback".',
      );
      expect(resBody.status_code).toEqual(403);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
    });
  });
});
