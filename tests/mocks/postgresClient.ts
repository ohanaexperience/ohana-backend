import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export class PostgresClient {
  private pool: Pool;
  private db: any;

  constructor(config?: any) {
    // In test environment, we can use a mock
    if (process.env.NODE_ENV === 'test') {
      this.pool = {} as Pool;
      this.db = {};
      return;
    }

    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    this.db = drizzle(this.pool);
  }

  // Add methods as needed
  async query(sql: string, params?: any[]) {
    return this.pool.query(sql, params);
  }

  // Drizzle methods
  insert(table: any) {
    return this.db.insert(table);
  }

  select(...args: any[]) {
    return this.db.select(...args);
  }

  update(table: any) {
    return this.db.update(table);
  }

  delete(table: any) {
    return this.db.delete(table);
  }

  async end() {
    await this.pool.end();
  }
}