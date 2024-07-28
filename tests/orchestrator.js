import retry from "async-retry";
import setCookieParser from "set-cookie-parser";
import { faker } from "@faker-js/faker";

import db from "infra/database";
import migrator from "infra/migrator.js";
import user from "models/user";
import session from "models/session";
import webserver from "infra/webserver";
import tuit from "models/tuit";

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

async function createSession(sessionObj) {
  return await session.create(sessionObj.id);
}

async function findSessionByToken(token) {
  return await session.findByToken(token);
}

async function removeFeaturesFromUser(userObj, features) {
  return await user.removeFeatures(userObj.id, features);
}

async function addFeaturesToUser(userObj, features) {
  return await user.addFeatures(userObj.id, features);
}

function parseSetCookies(res) {
  const setCookieHeaderValues = res.headers.get("set-cookie");
  const parsedCookies = setCookieParser.parse(setCookieHeaderValues, {
    map: true,
  });
  return parsedCookies;
}

async function createTuit(values = {}) {
  const info = await getTuitInfo(values);

  return await tuit.create(info);
}

async function getTuitInfo(values = {}) {
  const info = {
    body: values.body || "Body text.",
    parent_id: values.parent_id || undefined,
    quote_id: values.quote_id || undefined,
  };

  let defaultUser;
  if (!values.userObj) {
    defaultUser = await createUser();
  } else {
    defaultUser = values.userObj;
  }

  info.owner_id = defaultUser.id;

  return info;
}

async function runTransaction(queryFunction, ...args) {
  const transaction = await db.transaction();
  try {
    await transaction.query("BEGIN");
    const result = await queryFunction(...args, { transaction });
    await transaction.query("COMMIT");
    return result;
  } catch (err) {
    await transaction.query("ROLLBACK");
    throw err;
  } finally {
    await transaction.release();
  }
}

async function viewTuit(values = {}) {
  const userObj = values.userObj ? values.userObj : await createUser();
  return await runTransaction(tuit.view, userObj.id, values.tuitId);
}

async function likeTuit(values = {}) {
  const userObj = values.userObj ? values.userObj : await createUser();
  return await runTransaction(tuit.like, userObj.id, values.tuitId);
}

async function retuitTuit(values = {}) {
  const userObj = values.userObj ? values.userObj : await createUser();
  return await runTransaction(tuit.retuit, userObj.id, values.tuitId);
}

async function bookmarkTuit(values = {}) {
  const userObj = values.userObj ? values.userObj : await createUser();
  return await runTransaction(tuit.bookmark, userObj.id, values.tuitId);
}

async function commentTuit(values = {}) {
  const info = await getTuitInfo(values);

  return await tuit.comment(info);
}

async function quoteTuit(values = {}) {
  const info = await getTuitInfo(values);

  return await tuit.quote(info);
}

async function generateRandomTuitCommentQuote(i) {
  const generatedTuit = await createTuit({
    body: `${i} generated tuit.`,
  });

  await viewTuit({
    tuitId: generatedTuit.id,
  });
  await likeTuit({
    tuitId: generatedTuit.id,
  });
  await retuitTuit({
    tuitId: generatedTuit.id,
  });
  await bookmarkTuit({
    tuitId: generatedTuit.id,
  });

  await commentTuit({
    parent_id: generatedTuit.id,
    body: `${i} generated tuit comment.`,
  });

  await quoteTuit({
    quote_id: generatedTuit.id,
    body: `${i} generated tuit quote.`,
  });
}

async function generateTuits(amount) {
  for (let i = 0; i < amount; i++) {
    await generateRandomTuitCommentQuote(i);
  }
}

async function generateTuitCommentQuote(
  body,
  views,
  likes,
  retuits,
  bookmarks,
  userObj,
) {
  let tuitValues = { body: body ? body : "Tuit" };
  if (userObj) {
    tuitValues = { ...tuitValues, userObj };
  }

  const generatedTuit = await createTuit(tuitValues);

  async function performAction(actionName, count) {
    await Promise.all(
      Array.from({ length: count }, () =>
        orchestrator[actionName]({ tuitId: generatedTuit.id }),
      ),
    );
  }

  await performAction("viewTuit", views);
  await performAction("likeTuit", likes);
  await performAction("retuitTuit", retuits);
  await performAction("bookmarkTuit", bookmarks);

  const generatedTuitComment = await commentTuit({
    parent_id: generatedTuit.id,
    body: `${body}, comment.`,
  });
  const generatedTuitQuote = await quoteTuit({
    quote_id: generatedTuit.id,
    body: `${body}, quote.`,
  });

  const updatedGeneratedTuit = await tuit.findById(generatedTuit.id);

  return {
    updatedGeneratedTuit,
    generatedTuitComment,
    generatedTuitQuote,
  };
}

async function generateComments(tuitId, amount) {
  for (let i = 0; i < amount; i++) {
    await commentTuit({
      parent_id: tuitId,
      body: `${tuitId} comment.`,
    });
  }
}

const orchestrator = {
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
  createTuit,
  viewTuit,
  likeTuit,
  retuitTuit,
  bookmarkTuit,
  commentTuit,
  quoteTuit,
  generateTuits,
  generateTuitCommentQuote,
  generateComments,
};

export default orchestrator;
