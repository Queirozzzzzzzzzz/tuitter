exports.up = async (pgm) => {
  await pgm.createTable("tuits", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
      unique: true,
    },

    owner_id: {
      type: "uuid",
      notNull: true,
    },

    parent_id: {
      type: "uuid",
      notNull: false,
    },

    quote_id: {
      type: "uuid",
      notNull: false,
    },

    body: {
      type: "varchar(255)",
      notNull: true,
    },

    status: {
      type: "varchar",
      default: "published",
      notNull: true,
      check: "status IN ('disabled', 'published')",
    },

    views: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    likes: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    retuits: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    bookmarks: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    comments: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    quotes: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("(now() at time zone 'utc')"),
    },

    updated_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropTable("tuits");
};
