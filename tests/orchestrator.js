import retry from "async-retry";
import setCookieParser from "set-cookie-parser";
import { faker } from "@faker-js/faker";

import db from "infra/database";
import migrator from "infra/migrator.js";
import user from "models/user";
import session from "models/session";
import webserver from "infra/webserver";

if (process.env.NODE_ENV !== "test") {
  throw new Error({
    message: "Orchestrator should only be used in tests",
  });
}

const webserverUrl = webserver.host;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForDatabase();

  async function waitForWebServer() {
    return await retry(
      async (bail, tries) => {
        if (tries >= 25) {
          console.log(
            `> Trying to connect to Webserver #${tries}. Are you running the server with "npm run dev"?`,
          );
        }
        await fetch(`${webserverUrl}/api/v1/status`);
      },
      {
        retries: 50,
        minTimeout: 10,
        maxTimeout: 1000,
        factor: 1.1,
      },
    );
  }

  async function waitForDatabase() {
    return await retry(
      async (bail, tries) => {
        if (tries >= 25) {
          console.log(
            `> Trying to connect to Database #${tries}. Are you running the Postgres container?`,
          );
        }
        const connection = await db.getNewClient();
        await connection.end();
      },
      {
        retries: 50,
        minTimeout: 10,
        maxTimeout: 1000,
        factor: 1.1,
      },
    );
  }
}

async function dropAllTables() {
  const dbClient = await db.getNewClient();
  await dbClient.query("drop schema public cascade; create schema public;");

  await dbClient.end();
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

const usedFakeTagsOrUsernames = new Set();
const usedFakeEmails = new Set();
function getFakeTagOrUsername() {
  let tagOrUsername;
  while (!tagOrUsername) {
    tagOrUsername = faker.internet
      .userName()
      .replace(/[_.-]/g, "")
      .substring(0, 29);

    if (usedFakeTagsOrUsernames.has(tagOrUsername)) {
      tagOrUsername = undefined;
    } else {
      usedFakeTagsOrUsernames.add(tagOrUsername);
    }
  }

  return tagOrUsername;
}

function getFakeEmail() {
  let email;
  while (!email) {
    email = faker.internet.email();

    if (usedFakeEmails.has(email)) {
      email = undefined;
    } else {
      usedFakeEmails.add(email);
    }
  }

  return email;
}

async function createUser(userObj) {
  const info = {
    tag: userObj?.tag || getFakeTagOrUsername(),
    username: userObj?.username || getFakeTagOrUsername(),
    email: userObj?.email || getFakeEmail(),
    password: userObj?.password || "validuserpassword",
    description: userObj?.description || "",
  };

  return await user.create(info);
}

async function createSession(userObj) {
  return await session.create(userObj.id);
}

async function findSessionByToken(token) {
  return await session.findByToken(token);
}

async function removeFeaturesFromUser(obj, features) {
  return await user.removeFeatures(obj.id, features);
}

async function addFeaturesToUser(obj, features) {
  return await user.addFeatures(obj.id, features);
}

function parseSetCookies(res) {
  const setCookieHeaderValues = res.headers.get("set-cookie");
  const parsedCookies = setCookieParser.parse(setCookieHeaderValues, {
    map: true,
  });
  return parsedCookies;
}

export default {
  webserverUrl,
  waitForAllServices,
  dropAllTables,
  runPendingMigrations,
  createUser,
  createSession,
  parseSetCookies,
  findSessionByToken,
  removeFeaturesFromUser,
  addFeaturesToUser,
};
