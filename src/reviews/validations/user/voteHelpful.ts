import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Path parameters schema
export const VoteHelpfulPathSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID")
});

// Combined validation schema
export const voteHelpfulValidation = z.object({
  pathParameters: VoteHelpfulPathSchema
});

// Event type
export type VoteHelpfulEvent = Omit<APIGatewayEvent, "pathParameters"> & {
  pathParameters: z.infer<typeof VoteHelpfulPathSchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type VoteHelpfulRequest = {
    userId: string;
    reviewId: string;
};

export type RemoveHelpfulVoteRequest = VoteHelpfulRequest;