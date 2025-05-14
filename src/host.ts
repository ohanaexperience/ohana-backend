import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { requireBody, zodValidator } from "./middleware";
import {
    HostRegisterSchema,
    HostRegisterData,
} from "./constants/validations/schemas";

export const register = middy(async (event: HostRegisterData) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            languages,
            bio,
            idVerified,
            termsAccepted,
        } = event.body;
        console.log("event", event);

        await users.create({
            id: "g392jf92392k3e",
            email: email,
            // isHost: true,
            // hostVerificationStatus: "pending_review",
            hostVerificationDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Host successfully registered.",
            }),
        };
    } catch (err: any) {
        console.error("Error creating user with email:", err);

        // if (err.message) {
        //     return {
        //         statusCode: err.statusCode,
        //         body: JSON.stringify({
        //             error: err.__type,
        //             message: err.message,
        //         }),
        //     };
        // }

        // return {
        //     statusCode: 500,
        //     body: JSON.stringify({
        //         error: "Internal server error",
        //         message: "An unexpected error occurred",
        //     }),
        // };
    }
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator(HostRegisterSchema))
    .use(cors());
