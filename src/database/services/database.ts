import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

import Postgres from "@/database/postgres";
import { seedCategories } from "@/seed";

export class DatabaseService {
    private readonly db: Postgres;

    constructor(database: Postgres) {
        this.db = database;
    }

    async runMigrations() {
        await this.db.instance.execute(
            sql`CREATE EXTENSION IF NOT EXISTS postgis;`
        );

        const migrationsFolder = path.join(__dirname, "../db/migrations");

        console.log("Running migrations...");
        await migrate(this.db.instance, { migrationsFolder: migrationsFolder });
        console.log("Migrations completed successfully");
    }

    async clearDatabase() {
        const tablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public';
        `;
        const typesQuery = `
            SELECT t.typname as type_name, 
                   CASE 
                       WHEN t.typtype = 'e' THEN 'enum'
                       ELSE t.typtype::text 
                   END as type
            FROM pg_type t 
            JOIN pg_namespace n ON t.typnamespace = n.oid 
            WHERE n.nspname = 'public'
            AND t.typtype = 'e';  -- 'e' for enum types
        `;

        const tables = await this.db.instance.execute(tablesQuery);
        const types = await this.db.instance.execute(typesQuery);

        // Drop all tables
        if (tables.rows.length > 0) {
            const dropTablesQuery = `DROP TABLE IF EXISTS ${tables.rows
                .map((row) => `"${row.table_name}"`)
                .join(", ")} CASCADE;`;
            await this.db.instance.execute(dropTablesQuery);
        }

        // Drop all enum types
        if (types.rows.length > 0) {
            const dropTypesQuery = `DROP TYPE IF EXISTS ${types.rows
                .map((row) => `"${row.type_name}"`)
                .join(", ")} CASCADE;`;
            await this.db.instance.execute(dropTypesQuery);
        }

        console.log(
            `Dropped ${tables.rows.length} tables and ${types.rows.length} types`
        );

        console.log("Tables in database:");
        console.log(tables.rows);

        console.log("\nEnum types in database:");
        console.log(types.rows);
    }

    async testDatabase() {
        // await db.instance.execute(sql`DELETE FROM experience_availability;`);
        // await db.instance.execute(sql`DELETE FROM experiences;`);
        // const users = await db.users.getAll();
        // const hostVerifications = await db.hostVerifications.getAll();
        // const hosts = await db.hosts.getAll();
        // await db.experiences.delete("3eb11211-ffb6-42c9-8fb0-d9432717c300");
        const experiences = await this.db.experiences.getAll();
        const availability = await this.db.availability.getAll();
        const timeSlots = await this.db.timeSlots.getAll();
        // const categories = await db.categories.getAll();
        // const subCategories = await db.subCategories.getAll();

        return {
            experiences,
            availability,
            timeSlots,
        };
    }

    async seedDatabase() {
        console.log("🌱 Starting database seeding...");

        await seedCategories(this.db);

        console.log("🎉 All seeding completed!");
    }
}
