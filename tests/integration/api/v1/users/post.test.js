import { version as uuidVersion } from "uuid";

import password from "models/password.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("With unique and valid data", async () => {
      const values = {
        tag: "uniqueusertag",
        username: "Unique User Username",
        email: "uniqueuseremail@email.com",
        password: "uniqueuserpassword",
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag: values.tag,
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(resBody.tag).toEqual(values.tag);
      expect(resBody.username).toEqual(values.username);
      expect(resBody.features).toEqual([
        "read:session",
        "create:session",
        "read:user",
      ]);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const userInDatabase = await user.findByUsername(values.username);
      const validPasswordsMatch = await password.compare(
        values.password,
        userInDatabase.password,
      );
      const wrongPasswordMatch = await password.compare(
        "wronguserpassword",
        userInDatabase.password,
      );

      expect(userInDatabase.email).toBe(values.email);
      expect(validPasswordsMatch).toBe(true);
      expect(wrongPasswordMatch).toBe(false);
    });

    test("With unique and valid data, and an unknown key", async () => {
      const values = {
        tag: "unknownkeytag",
        username: "Unknownkey Username",
        email: "unknownkeyemail@email.com",
        password: "unknownkeypassword",
        unknownKey: "Unknown Key",
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag: values.tag,
          username: values.username,
          email: values.email,
          password: values.password,
          unknownKey: values.unknownKey,
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(resBody.tag).toEqual(values.tag);
      expect(resBody.username).toEqual(values.username);
      expect(resBody.features).toEqual([
        "read:session",
        "create:session",
        "read:user",
      ]);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const userInDatabase = await user.findByUsername(values.username);
      const validPasswordsMatch = await password.compare(
        values.password,
        userInDatabase.password,
      );
      const wrongPasswordMatch = await password.compare(
        "wronguserpassword",
        userInDatabase.password,
      );

      expect(userInDatabase.email).toBe(values.email);
      expect(validPasswordsMatch).toBe(true);
      expect(wrongPasswordMatch).toBe(false);
    });

    test(`With unique and valid data, but with "untrimmed" values`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag: "untrimmedvaluestag",
          username: "extraSpaceInTheEnd ",
          email: " space.in.the.beggining@gmail.com",
          password: "extraspaceintheendpassword ",
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(uuidVersion(resBody.id)).toEqual(4);
      expect(resBody.tag).toEqual("untrimmedvaluestag");
      expect(resBody.username).toEqual("extraSpaceInTheEnd");
      expect(resBody.features).toEqual([
        "read:session",
        "create:session",
        "read:user",
      ]);
      expect(Date.parse(resBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(resBody.updated_at)).not.toEqual(NaN);

      const userInDatabase = await user.findByUsername("extraSpaceInTheEnd");
      const validPasswordsMatch = await password.compare(
        "extraspaceintheendpassword",
        userInDatabase.password,
      );
      const wrongPasswordMatch = await password.compare(
        "wronguserpassword",
        userInDatabase.password,
      );

      expect(userInDatabase.email).toBe("space.in.the.beggining@gmail.com");
      expect(validPasswordsMatch).toBe(true);
      expect(wrongPasswordMatch).toBe(false);
    });

    describe("Tag", () => {
      test(`With "tag" duplicated`, async () => {
        const values = {
          tag: "uniqueusertag",
          username: "Duplicated Tag Username",
          email: "duplicatedtagemail@email.com",
          password: "duplicatedtagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          'A "tag" informada já está sendo usada.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:USER:VALIDATE_UNIQUE_TAG:ALREADY_EXISTS",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" missing`, async () => {
        const values = {
          username: "Missing Tag Username",
          email: "missingtagemail@email.com",
          password: "missingtagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"tag" é um campo obrigatório.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" with a null value`, async () => {
        const values = {
          tag: null,
          username: "Null Tag Username",
          email: "nulltagemail@email.com",
          password: "nulltagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"tag" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" with an empty string`, async () => {
        const values = {
          tag: "",
          username: "Empty Tag Username",
          email: "emptytagemail@email.com",
          password: "emptytagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"tag" não pode estar em branco.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" that\'s not a String`, async () => {
        const values = {
          tag: 1234,
          username: "NonString Tag Username",
          email: "nonstringtagemail@email.com",
          password: "nonstringtagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"tag" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" containing non alphanumeric characters`, async () => {
        const values = {
          tag: "alphanumeric !tag",
          username: "Alphanumeric Tag Username",
          email: "alphanumerictagemail@email.com",
          password: "alphanumerictagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          '"tag" deve conter apenas caracteres alfanuméricos.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" too long`, async () => {
        const values = {
          tag: "tag31characterssssssssssssssssssss",
          username: "Too Long Tag Username",
          email: "toolongtagemail@email.com",
          password: "toolongtagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          '"tag" deve conter no máximo 30 caracteres.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });

      test(`With "tag" in blocked list`, async () => {
        const values = {
          tag: "administrator",
          username: "Blocked List Tag Username",
          email: "blockedlisttagemail@email.com",
          password: "blockedlisttagpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          "Esta tag de usuário não está disponível para uso.",
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("tag");
      });
    });

    describe("Username", () => {
      test(`With "username" duplicated`, async () => {
        const values = {
          tag: "duplicatedusernametag",
          username: "Unique User Username",
          email: "duplicatedusernameemail@email.com",
          password: "duplicatedusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          'O "username" informado já está sendo usado.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:USER:VALIDATE_UNIQUE_USERNAME:ALREADY_EXISTS",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" missing`, async () => {
        const values = {
          tag: "missingusernametag",
          email: "missingusernameemail@email.com",
          password: "missingusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"username" é um campo obrigatório.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" with a null value`, async () => {
        const values = {
          tag: "nullusernametag",
          username: null,
          email: "nullusernameemail@email.com",
          password: "nullusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"username" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" with an empty string`, async () => {
        const values = {
          tag: "emptyusernametag",
          username: "",
          email: "emptyusernameemail@email.com",
          password: "missingusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"username" não pode estar em branco.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" that\'s not a String`, async () => {
        const values = {
          tag: "nonstringusernametag",
          username: 1234,
          email: "nonstringusernameemail@email.com",
          password: "nonstringusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"username" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" containing non alphanumeric characters`, async () => {
        const values = {
          tag: "alphanumericusernametag",
          username: "alphanumeric!username",
          email: "alphanumericusernameemail@email.com",
          password: "alphanumericusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"username" está no formato errado.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" too long`, async () => {
        const values = {
          tag: "toolongusernametag",
          username: "username31characterssssssssssss",
          email: "toolongusernameemail@email.com",
          password: "toolongusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          '"username" deve conter no máximo 30 caracteres.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });

      test(`With "username" in blocked list`, async () => {
        const values = {
          tag: "blockedlistusernametag",
          username: "administrator",
          email: "blockedlistusernameemail@email.com",
          password: "blockedlistusernamepassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          "Este nome de usuário não está disponível para uso.",
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("username");
      });
    });

    describe("Email", () => {
      test(`With "email" duplicated`, async () => {
        const values = {
          tag: "duplicatedemailtag",
          username: "Duplicated Email Username",
          email: "uniqueuseremail@email.com",
          password: "duplicatedemailpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          'O "email" informado já está sendo usado.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:USER:VALIDATE_UNIQUE_EMAIL:ALREADY_EXISTS",
        );
        expect(resBody.key).toEqual("email");
      });

      test(`With "email" missing`, async () => {
        const values = {
          tag: "missingemailtag",
          username: "Missing Email Username",
          password: "missingemailpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"email" é um campo obrigatório.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("email");
      });

      test(`With "email" with an empty string`, async () => {
        const values = {
          tag: "emptyemailtag",
          username: "Empty Email Username",
          email: "",
          password: "emptyemailpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"email" não pode estar em branco.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("email");
      });

      test(`With "email" that\'s not a String`, async () => {
        const values = {
          tag: "nonstringemailtag",
          username: "NonString Email Username",
          email: 1234,
          password: "nonstringemailpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"email" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("email");
      });

      test(`With "email" in invalid format`, async () => {
        const values = {
          tag: "invalidformatemailtag",
          username: "Invalid Format Email Username",
          email: "invalid-email-format@email@com",
          password: "invalidformatemailpassword",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"email" deve conter um email válido.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("email");
      });
    });

    describe("Password", () => {
      test(`With "password" missing`, async () => {
        const values = {
          tag: "missingpasswordtag",
          username: "Missing Password Username",
          email: "missingpasswordemail@email.com",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"password" é um campo obrigatório.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("password");
      });

      test(`With "password" with an empty string`, async () => {
        const values = {
          tag: "emptypasswordtag",
          username: "Empty Password Username",
          email: "emptypasswordemail@email.com",
          password: "",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"password" não pode estar em branco.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("password");
      });

      test(`With "password" that's not a String`, async () => {
        const values = {
          tag: "nonstringpasswordtag",
          username: "Non String Password Username",
          email: "nonstringpasswordemail@email.com",
          password: 12345678,
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual('"password" deve ser do tipo String.');
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("password");
      });

      test(`With "password" too short`, async () => {
        const values = {
          tag: "shortpasswordtag",
          username: "Short Password Username",
          email: "shortpasswordemail@email.com",
          password: "short",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          '"password" deve conter no mínimo 8 caracteres.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("password");
      });

      test(`With "password" too long`, async () => {
        const values = {
          tag: "longpasswordtag",
          username: "Long Password Username",
          email: "longpasswordemail@email.com",
          password:
            "password73characterssssssssssssssssssssssssssssssssssssssssssssssssssssss",
        };

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: values.tag,
            username: values.username,
            email: values.email,
            password: values.password,
          }),
        });

        const resBody = await res.json();

        expect(res.status).toEqual(400);
        expect(resBody.status_code).toEqual(400);
        expect(resBody.name).toEqual("ValidationError");
        expect(resBody.message).toEqual(
          '"password" deve conter no máximo 72 caracteres.',
        );
        expect(resBody.action).toEqual(
          "Ajuste os dados enviados e tente novamente.",
        );
        expect(uuidVersion(resBody.error_id)).toEqual(4);
        expect(uuidVersion(resBody.request_id)).toEqual(4);
        expect(resBody.error_location_code).toEqual(
          "MODEL:VALIDATOR:FINAL_SCHEMA",
        );
        expect(resBody.key).toEqual("password");
      });
    });

    test(`With "body" blank`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
      });

      const resBody = await res.json();

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
      expect(resBody.key).toEqual("object");
    });

    test(`With "body" with a String`, async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        body: ":)",
      });

      const resBody = await res.json();

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
      expect(resBody.key).toEqual("object");
    });
  });
});
