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


import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.acfbjecrmmwodqrnzawp:goranshB_database@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
//------------------------------------------------------------
// import pkg from "pg";
// import dns from "dns";

// dns.setDefaultResultOrder('ipv4first');

// const { Pool } = pkg;

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// export default pool;



//------------------------------------------------------------

// import pkg from "pg";
// import dns from "dns";
// dns.setDefaultResultOrder('ipv4first');

// const { Pool } = pkg;

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
//   max: 5
// >>>>>>> 86de4be815302ef3086122dd3f4be5109828a19c
});

export default pool;
