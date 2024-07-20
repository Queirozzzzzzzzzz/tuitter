import retry from "async-retry";
import { Client, Pool } from "pg";
import snakeize from "snakeize";

import webserver from "infra/webserver";
import { ServiceError } from "errors";
import logger from "infra/logger";

const config = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV == "production",
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000,
  max: 1,
};

if (!webserver.isServerlessRuntime) {
  config.max = 30;
}

const cache = {
  pool: null,
  poolQueryCount: 0,
  maxConnections: null,
  openedConnectionsLastUpdate: null,
  openedConnections: null,
};

async function query(query) {
  let client;
  cache.poolQueryCount += 1;

  try {
    client = await tryToGetNewClientFromPool();
    return await client.query(query);
  } catch (err) {
    throw parseQueryErrorAndLog(err, query);
  } finally {
    if (client) {
      const tooManyConnections = await checkForTooManyConnections(client);
      client.release(tooManyConnections && webserver.isServerlessRuntime);
    }
  }
}

async function tryToGetNewClientFromPool() {
  const clientFromPool = await retry(newClientFromPool, {
    retries: webserver.isBuildTime ? 12 : 1,
    minTimeout: 150,
    maxTimeout: 5000,
    factor: 2,
  });

  return clientFromPool;

  async function newClientFromPool() {
    if (!cache.pool) {
      cache.pool = new Pool(config);
    }

    return await cache.pool.connect();
  }
}

async function checkForTooManyConnections(client) {
  if (webserver.isBuildTime) return false;

  const currentTime = new Date().getTime();
  const openedConnectionsMaxAge = 5000;
  const maxConnectionsTolerance = 0.8;

  try {
    if (cache.maxConnections === null || cache.reservedConnections === null) {
      const [maxConnections, reservedConnections] = await getConnectionLimits();
      cache.maxConnections = maxConnections;
      cache.reservedConnections = reservedConnections;
    }

    if (
      cache.openedConnections === null ||
      currentTime - cache.openedConnectionsLastUpdate > openedConnectionsMaxAge
    ) {
      const openedConnections = await getOpenedConnections();
      cache.openedConnections = openedConnections;
      cache.openedConnectionsLastUpdate = currentTime;
    }
  } catch (err) {
    if (err.code === "ECONNRESET") {
      return true;
    }
    throw err;
  }

  if (
    cache.openedConnections >
    (cache.maxConnections - cache.reservedConnections) * maxConnectionsTolerance
  ) {
    return true;
  }

  return false;

  // Functions
  async function getConnectionLimits() {
    const [maxConnectionsResult, reservedConnectionResult] = await client.query(
      "SHOW max_connections; SHOW superuser_reserved_connections;",
    );
    return [
      maxConnectionsResult.rows[0].max_connections,
      reservedConnectionResult.rows[0].superuser_reserved_connections,
    ];
  }

  async function getOpenedConnections() {
    const openConnectionsResult = await client.query({
      text: `SELECT numbackends as opened_connections FROM pg_stat_database WHERE datname = $1;`,
      values: [process.env.POSTGRES_DB],
    });
    return openConnectionsResult.rows[0].opened_connections;
  }
}

async function getNewClient() {
  try {
    const client = await tryToGetNewClient();
    return client;
  } catch (err) {
    const errorObj = new ServiceError({
      message: err.message,
      errorLocationCode: "INFRA:DATABASE:GET_NEW_CONNECTED_CLIENT",
      stack: new Error().stack,
    });

    logger.error(snakeize(errorObj));
    throw errorObj;
  }
}

async function tryToGetNewClient() {
  const client = await retry(newClient, {
    retries: 50,
    minTimeout: 0,
    factor: 2,
  });

  return client;

  // Must finish the client after finishing
  async function newClient() {
    const client = new Client(config);
    await client.connect();
    return client;
  }
}

const UNIQUE_CONSTRAINT_VIOLATION = "23505";
const SERIALIZATION_FAILURE = "40001";
const UNDEFINED_FUNCTION = "42883";

function parseQueryErrorAndLog(err, query) {
  const expectedErrorsCode = [
    UNIQUE_CONSTRAINT_VIOLATION,
    SERIALIZATION_FAILURE,
  ];

  if (!webserver.isServerlessRuntime) {
    expectedErrorsCode.push(UNDEFINED_FUNCTION);
  }

  const errorToReturn = new ServiceError({
    message: err.message,
    context: {
      query: query,
      databaseCache: { ...cache, pool: !!cache.pool },
    },
    errorLocationCode: "INFRA:DATABASE:QUERY",
    databaseErrorCode: err.code,
  });

  if (!expectedErrorsCode.includes(err.code)) {
    logger.error(snakeize(errorToReturn));
  }

  return errorToReturn;
}

export default {
  query,
  getNewClient,
  errorCodes: {
    UNIQUE_CONSTRAINT_VIOLATION,
    SERIALIZATION_FAILURE,
    UNDEFINED_FUNCTION,
  },
};
