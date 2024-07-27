exports.up = async function (pgm) {
  await pgm.createTable("bookmarks", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },

    owner_id: {
      type: "uuid",
      notNull: true,
    },

    tuit_id: {
      type: "uuid",
      notNull: true,
    },

    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });
};

exports.down = async function (pgm) {
  await pgm.dropTable("bookmarks");
};
