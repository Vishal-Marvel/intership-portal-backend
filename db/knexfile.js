const dotenv = require("dotenv");
dotenv.config({ path: "../config.env" });

module.exports = {
  development: {
    client: "mysql",
    connection: {
      host: process.env.HOST_NAME,
      user: process.env.USER_NAME,
      password: process.env.SQL_PASSWORD,
      database: process.env.DATABASE,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    useNullAsDefault: true,
  },
  preview: {
    client: "mysql",
    connection: {
      host: process.env.A_HOST_NAME,
      user: process.env.A_USER_NAME,
      password: process.env.A_PASSWORD,
      port: process.env.A_PORT,
      database: process.env.A_DATABASE,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    useNullAsDefault: true,
  },
};
