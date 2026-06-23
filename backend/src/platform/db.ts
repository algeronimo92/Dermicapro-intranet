import { Pool } from 'pg';

const platformPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export default platformPool;
