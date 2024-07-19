import db from "infra/database";

export default async function status(req, res) {
  const updatedAt = new Date().toISOString();

  const dbName = process.env.POSTGRES_DB;
  const dbVersionRes = await db.query("SHOW server_version;");
  const dbVersion = dbVersionRes.rows[0].server_version;
  const dbMaxConnectionsRes = await db.query("SHOW max_connections;");
  const dbMaxConnections = dbMaxConnectionsRes.rows[0].max_connections;
  const dbOpenedConnectionsRes = await db.query({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [dbName],
  });
  const dbOpenedConnections = dbOpenedConnectionsRes.rows[0].count;

  return res.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: dbVersion,
        max_connections: parseInt(dbMaxConnections),
        opened_connections: dbOpenedConnections,
      },
    },
  });
}
