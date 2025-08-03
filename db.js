// import pkg from "pg";
// const { Pool } = pkg;

// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   password: "database_postgre",
//   port: 5432,
//   database: "Project-ONE",
// });

// export default pool;

import pkg from "pg";
import dns from "dns";

dns.setDefaultResultOrder('ipv4first');

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;


