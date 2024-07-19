import migrationRunner from "node-pg-migrate";
import { join, resolve } from "node:path";

import db from "infra/database";

const defaultConfigurations = {
  dir: join(resolve("."), "infra", "migrations"),
  direction: "up",
  migrationsTable: "migrations",
  verbose: true,
};

async function runPendingMigrations() {
  const dbClient = await db.getNewClient();

  try {
    const migratedMigrations = await migrationRunner({
      ...defaultConfigurations,
      dbClient: dbClient,
      dryRun: false,
      migrationsTable: "pgmigrations",
    });

    return migratedMigrations;
  } finally {
    await dbClient.end();
  }
}

export default {
  runPendingMigrations,
};
