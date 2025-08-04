import { z } from "zod";
import { APIGatewayProxyEventBase } from "aws-lambda";

// Query string parameters schema
export const getUserReservationsQuerySchema = z.object({
    status: z.enum([
        "held",
        "pending", 
        "confirmed",
        "cancelled",
        "completed",
        "refunded"
    ]).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
});

// Type for the Lambda event
export type GetUserReservationsData = APIGatewayProxyEventBase<{
    claims?: {
        sub: string;
    };
    userId?: string;
}> & {
    queryStringParameters?: z.infer<typeof getUserReservationsQuerySchema>;
};