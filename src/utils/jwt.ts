import { jwtDecode } from "jwt-decode";

import { DecodedIdToken } from "../types";

export const decodeToken = (Authorization: string) => {
    let decodedIdToken: DecodedIdToken = jwtDecode(
        Authorization.split("Bearer ")[1]
    );

    return decodedIdToken;
};
