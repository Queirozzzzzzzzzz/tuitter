import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import RequestBuilder from "tests/requestBuilder";
import tuit from "models/tuit";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/tuits/[id]", () => {
  describe("Anonymous user", () => {
    test("Deleting tuit", async () => {
      const tuit = await orchestrator.createTuit();
      const requestBuilder = new RequestBuilder(`/api/v1/tuits/${tuit.id}`);
      const { res, resBody } = await requestBuilder.delete();

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "update:tuit".',
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
    });
  });

  describe("Default user", () => {
    test("Deleting tuit", async () => {
      const requestBuilder = new RequestBuilder(`/api/v1/tuits`);
      const defaultUser = await requestBuilder.buildUser();
      const userTuit = await orchestrator.createTuit({ userObj: defaultUser });

      const { res, resBody } = await requestBuilder.delete(`/${userTuit.id}`);

      expect(res.status).toBe(200);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.parent_id).toEqual(null);
      expect(resBody.quote_id).toEqual(null);
      expect(resBody.status).toEqual("disabled");
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const tuitInDatabase = await tuit.findById(userTuit.id);
      expect(tuitInDatabase.status).toEqual("disabled");
    });

    test("Deleting another user tuit", async () => {
      const requestBuilder = new RequestBuilder(`/api/v1/tuits`);
      await requestBuilder.buildUser();
      const secondUserTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.delete(
        `/${secondUserTuit.id}`,
      );

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Você não possui permissão para atualizar o tuit de outro usuário.",
      );
      expect(resBody.action).toEqual(
        'Verifique se você possui a feature "update:tuit:others".',
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "CONTROLLER:TUITS:PATCH:USER_CANT_UPDATE_TUIT_FROM_OTHER_USER",
      );
    });
  });

  describe('User with "update:tuit:others" feature', () => {
    test("Deleting tuit", async () => {
      const requestBuilder = new RequestBuilder(`/api/v1/tuits`);
      const defaultUser = await requestBuilder.buildUser();
      await orchestrator.addFeaturesToUser(defaultUser, ["update:tuit:others"]);
      const targetTuit = await orchestrator.createTuit();

      const { res, resBody } = await requestBuilder.delete(`/${targetTuit.id}`);

      expect(res.status).toBe(200);
      expect(resBody.owner_id).toEqual(targetTuit.owner_id);
      expect(resBody.parent_id).toEqual(null);
      expect(resBody.quote_id).toEqual(null);
      expect(resBody.status).toEqual("disabled");
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const tuitInDatabase = await tuit.findById(targetTuit.id);
      expect(tuitInDatabase.status).toEqual("disabled");
    });
  });

  describe('User without "update:tuit" feature', () => {
    test("Deleting tuit", async () => {
      const requestBuilder = new RequestBuilder(`/api/v1/tuits`);
      const defaultUser = await requestBuilder.buildUser();
      await orchestrator.removeFeaturesFromUser(defaultUser, ["update:tuit"]);
      const userTuit = await orchestrator.createTuit({ userObj: defaultUser });

      const { res, resBody } = await requestBuilder.delete(`/${userTuit.id}`);

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "update:tuit".',
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
    });
  });
});
