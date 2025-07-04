import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

export const GetProfileSchema = z.object({});

export type GetProfileData = APIGatewayEvent;

export type GetProfileRequest = {
    authorization: string;
};