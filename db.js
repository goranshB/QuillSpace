import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  password: "database_postgre",
  port: 5432,
  database: "Project-ONE",
});

export default pool;
