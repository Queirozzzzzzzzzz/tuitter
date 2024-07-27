import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import RequestBuilder from "tests/requestBuilder";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/tuits", () => {
  describe("Anonymous user", () => {
    test("Content with minimum valid data", async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      const { res, resBody } = await requestBuilder.post({
        body: "Não deveria ser possível.",
      });

      expect(res.status).toEqual(403);
      expect(resBody.status_code).toEqual(403);
      expect(resBody.name).toEqual("ForbiddenError");
      expect(resBody.message).toEqual(
        "Usuário não pode executar esta operação.",
      );
      expect(resBody.action).toEqual(
        'Verifique se este usuário possui a feature "create:tuit".',
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND",
      );
    });
  });

  describe("Default user", () => {
    test('Post without "body" and "Content-Type"', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();
      requestBuilder.buildHeaders({ "Content-Type": undefined });

      const { res, resBody } = await requestBuilder.post();

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" enviado deve ser do tipo Object.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "POST Body" containing an invalid JSON string"', async () => {
      const requestBuilder = new RequestBuilder();
      await requestBuilder.buildUser();
      requestBuilder.buildHeaders({ "Content-Type": undefined });

      const { res, resBody } = await requestBuilder.post(
        "/api/v1/tuits",
        "Não JSON",
      );

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" enviado deve ser do tipo Object.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "owner_id" pointing to another user', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      const defaultUser = await requestBuilder.buildUser();
      const secondUser = await orchestrator.createUser();

      const { res, resBody } = await requestBuilder.post({
        body: 'Campo "owner_id" da request deveria ser ignorado e pego através da sessão.',
        owner_id: secondUser.id,
      });

      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.parent_id).toBeNull();
      expect(resBody.body).toEqual(
        'Campo "owner_id" da request deveria ser ignorado e pego através da sessão.',
      );
      expect(resBody.status).toEqual("published");
      expect(resBody.likes).toBe(0);
      expect(resBody.retuits).toBe(0);
      expect(resBody.bookmarks).toBe(0);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);
    });

    test('Post without "body"', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({});

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"body" é um campo obrigatório.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "body" containing blank String', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({ body: "" });

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"body" não pode estar em branco.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "body" containing invalid characters at start', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({
        body: "\u200fTexto começando com caracteres inválidos.",
      });

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" deve começar com caracteres visíveis.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "body" containing more than 255 characters', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({
        body: "a".repeat(256),
      });

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" deve conter no máximo 255 caracteres.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "body" containing untrimmed values at start', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({
        body: " Texto começando com espaço no início.",
      });

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual(
        '"body" deve começar com caracteres visíveis.',
      );
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });

    test('Post with "body" containing untrimmed values at end', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      const defaultUser = await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({
        body: "Texto terminando com espaço ",
      });
      expect(res.status).toBe(201);
      expect(resBody.owner_id).toEqual(defaultUser.id);
      expect(resBody.parent_id).toBeNull();
      expect(resBody.body).toEqual("Texto terminando com espaço");
      expect(resBody.status).toEqual("published");
      expect(resBody.likes).toBe(0);
      expect(resBody.retuits).toBe(0);
      expect(resBody.bookmarks).toBe(0);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);
    });

    test('Post with "body" containing more than 255 characters', async () => {
      const requestBuilder = new RequestBuilder("/api/v1/tuits");
      await requestBuilder.buildUser();

      const { res, resBody } = await requestBuilder.post({
        body: null,
      });

      expect(res.status).toEqual(400);
      expect(resBody.status_code).toEqual(400);
      expect(resBody.name).toEqual("ValidationError");
      expect(resBody.message).toEqual('"body" deve ser do tipo String.');
      expect(resBody.action).toEqual(
        "Ajuste os dados enviados e tente novamente.",
      );
      expect(uuidVersion(resBody.error_id)).toEqual(4);
      expect(uuidVersion(resBody.request_id)).toEqual(4);
      expect(resBody.error_location_code).toEqual(
        "MODEL:VALIDATOR:FINAL_SCHEMA",
      );
    });
  });
});
