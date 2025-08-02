import middy from "@middy/core";

export const idempotencyHeaders = (): middy.MiddlewareObj => {
    return {
        after: async (request) => {
            // Add idempotency headers to response
            if (request.response && request.event.body) {
                const body = JSON.parse(request.event.body);
                if (body.idempotencyKey) {
                    request.response.headers = {
                        ...request.response.headers,
                        'X-Idempotency-Key': body.idempotencyKey,
                    };
                    
                    // If this is a duplicate request, add header
                    const responseBody = JSON.parse(request.response.body);
                    if (responseBody.duplicate) {
                        request.response.headers['X-Idempotent-Replayed'] = 'true';
                    }
                }
            }
        },
    };
};