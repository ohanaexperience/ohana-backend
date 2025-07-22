import { Handler } from "aws-lambda";
import { DatabaseFactory } from "../index";
import { createDatabaseConfig } from "../proxy-config";

export const handler: Handler = async () => {
    console.log("Starting database table and type dropping...");

    try {
        const dbConfig = createDatabaseConfig();
        const db = DatabaseFactory.create({ postgres: dbConfig });

        await db.connect();
        console.log("Database connection established");

        // List all tables in the database
        const tablesResult = await db.instance.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        const tableNames = tablesResult.rows.map((row: any) => row.table_name);
        console.log("Found tables in database:", tableNames);

        // List all custom ENUM types in the database
        const enumTypesResult = await db.instance.execute(`
            SELECT typname 
            FROM pg_type 
            WHERE typtype = 'e' 
            AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        const enumTypeNames = enumTypesResult.rows.map(
            (row: any) => row.typname
        );
        console.log("Found ENUM types in database:", enumTypeNames);

        // Drop all tables first (since they might reference ENUMs)
        const droppedTables: string[] = [];
        const failedTables: { name: string; error: string }[] = [];

        for (const tableName of tableNames) {
            try {
                await db.instance.execute(
                    `DROP TABLE IF EXISTS "${tableName}" CASCADE`
                );
                droppedTables.push(tableName);
                console.log(`Successfully dropped table: ${tableName}`);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                failedTables.push({ name: tableName, error: errorMessage });
                console.error(
                    `Failed to drop table ${tableName}:`,
                    errorMessage
                );
            }
        }

        // Drop all ENUM types after tables are dropped
        const droppedEnumTypes: string[] = [];
        const failedEnumTypes: { name: string; error: string }[] = [];

        for (const enumTypeName of enumTypeNames) {
            try {
                await db.instance.execute(
                    `DROP TYPE IF EXISTS "${enumTypeName}" CASCADE`
                );
                droppedEnumTypes.push(enumTypeName);
                console.log(`Successfully dropped ENUM type: ${enumTypeName}`);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                failedEnumTypes.push({
                    name: enumTypeName,
                    error: errorMessage,
                });
                console.error(
                    `Failed to drop ENUM type ${enumTypeName}:`,
                    errorMessage
                );
            }
        }

        await db.close();

        const success =
            failedTables.length === 0 && failedEnumTypes.length === 0;
        const statusCode = success ? 200 : 207; // 207 for partial success

        return {
            statusCode,
            body: JSON.stringify({
                message: success
                    ? "All database tables and ENUM types dropped successfully!"
                    : "Database cleanup completed with some failures",
                droppedTables,
                failedTables,
                droppedEnumTypes,
                failedEnumTypes,
                totalTables: tableNames.length,
                totalEnumTypes: enumTypeNames.length,
                tablesSuccessCount: droppedTables.length,
                tablesFailureCount: failedTables.length,
                enumTypesSuccessCount: droppedEnumTypes.length,
                enumTypesFailureCount: failedEnumTypes.length,
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Dropping tables and types failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Database cleanup failed",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            }),
        };
    }
};
