import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

import DatabaseFactory from "./database/database_factory";

const { DB_ENDPOINT, DB_NAME, DB_PORT, DB_USER, DB_PASSWORD } = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: false,
    },
});

export async function runMigrations(event: any) {
    try {
        await db.instance.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);

        const migrationsFolder = path.join(__dirname, "../db/migrations");

        console.log("Running migrations...");
        await migrate(db.instance, { migrationsFolder: migrationsFolder });
        console.log("Migrations completed successfully");
    } catch (err) {
        console.error("Error running migrations:", err);
    }
}

export async function clearDatabase() {
    try {
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

        const tables = await db.instance.execute(tablesQuery);
        const types = await db.instance.execute(typesQuery);

        // Drop all tables
        if (tables.rows.length > 0) {
            const dropTablesQuery = `DROP TABLE IF EXISTS ${tables.rows
                .map((row) => `"${row.table_name}"`)
                .join(", ")} CASCADE;`;
            await db.instance.execute(dropTablesQuery);
        }

        // Drop all enum types
        if (types.rows.length > 0) {
            const dropTypesQuery = `DROP TYPE IF EXISTS ${types.rows
                .map((row) => `"${row.type_name}"`)
                .join(", ")} CASCADE;`;
            await db.instance.execute(dropTypesQuery);
        }

        console.log(
            `Dropped ${tables.rows.length} tables and ${types.rows.length} types`
        );

        console.log("Tables in database:");
        console.log(tables.rows);

        console.log("\nEnum types in database:");
        console.log(types.rows);
    } catch (err) {
        console.error("Error clearing database:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error clearing database",
            }),
        };
    }
}

export async function test() {
    try {
        const users = await db.users.getAll();
        const hostVerifications = await db.hostVerifications.getAll();
        const hosts = await db.hosts.getAll();
        const experiences = await db.experiences.getAll();

        return {
            statusCode: 200,
            body: JSON.stringify({
                users,
                hostVerifications,
                hosts,
                experiences,
            }),
        };
    } catch (err) {
        console.error("Error clearing database:", err);
    }
}
