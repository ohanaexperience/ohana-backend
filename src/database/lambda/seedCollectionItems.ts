import { APIGatewayProxyResult } from "aws-lambda";
import { seedCollectionItems } from "../seeds/collection_items";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    try {
        await seedCollectionItems();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Collection items seeded successfully",
            }),
        };
    } catch (error) {
        console.error("Error seeding collection items:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to seed collection items",
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
};