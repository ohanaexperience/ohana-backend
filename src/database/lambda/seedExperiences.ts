import { APIGatewayProxyResult } from "aws-lambda";
import { runExperienceSeed } from "../seeds/experiences";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    try {
        await runExperienceSeed();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Experience seeding completed successfully",
            }),
        };
    } catch (error) {
        console.error("Error seeding experiences:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to seed experiences",
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
};