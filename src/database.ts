import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";

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
        await db.instance.execute(`
            DROP TABLE IF EXISTS host_verifications CASCADE;
            DROP TABLE IF EXISTS experiences CASCADE;
            DROP TABLE IF EXISTS hosts CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS verification_codes CASCADE;

            DROP TYPE IF EXISTS user_auth_provider CASCADE;
            DROP TYPE IF EXISTS host_verification_provider CASCADE;
            DROP TYPE IF EXISTS host_verification_status CASCADE;
            DROP TYPE IF EXISTS experience_status CASCADE;
        `);

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
        // await db.hostVerifications.create({
        //     userId: "14489498-1011-70f5-3a16-6f88f24d99f9",
        //     provider: "stripe_identity",
        //     status: "pending",
        //     submittedAt: new Date(),
        // });

        // await db.users.delete("d4a80478-e041-70c0-8851-9eb015f096c5");
        // const users = await db.users.getAll();
        // await db.hostVerifications.delete(
        //     "844824c8-e051-70c9-151d-d6839449b359"
        // );
        // await db.hostVerifications.delete(
        //     "441814f8-c031-70e3-24b6-6c63388d3f4b"
        // );
        // await db.hostVerifications.delete(
        //     "c4e864f8-80a1-706f-70a1-36bebbcd2e27"
        // );
        const hostVerifications = await db.hostVerifications.getAll();

        // await db.hostVerifications.delete(
        //     "14489498-1011-70f5-3a16-6f88f24d99f9"
        // );
        // const hostVerifications = await db.hostVerifications.getAll();

        // console.log("Result:", hostVerifications);
        // console.log("users", users);

        // const hostVerification = await db.hostVerifications.getById(
        //     "14489498-1011-70f5-3a16-6f88f24d99f9"
        // );
        // console.log("Result:", hostVerification);
        // await db.end();

        return {
            statusCode: 200,
            body: JSON.stringify(hostVerifications),
        };
    } catch (err) {
        console.error("Error clearing database:", err);
    }
}
