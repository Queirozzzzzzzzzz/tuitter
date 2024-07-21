exports.up = async (pgm) => {
  await pgm.createTable("posts", {
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

    content: {
      type: "varchar(255)",
      notNull: true,
    },

    status: {
      type: "varchar",
      default: "published",
      notNull: true,
      check: "status IN ('disabled', 'published')",
    },

    published_at: {
      type: "timestamp with time zone",
      notNull: false,
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
  await pgm.dropConstraint("posts", "posts_uniqueness_fkey");
  await pgm.dropTable("posts");
};
