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
});

export default pool;
