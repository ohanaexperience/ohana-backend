import { UpdateUserProfileRequest } from "../validations";
import { UserServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

export class UserService {
    private readonly db: Postgres;

    constructor({ database }: UserServiceOptions) {
        this.db = database;
    }

    async getProfile(request: { authorization: string }) {
        const { authorization } = request;

        const { sub } = decodeToken(authorization);

        const user = await this.db.users.getByUserId(sub);

        if (!user) {
            throw new Error(ERRORS.USER.NOT_FOUND.CODE);
        }

        const { id, createdAt, updatedAt, ...publicUserInfo } = user;
        const cleanedUserInfo = Object.fromEntries(
            Object.entries(publicUserInfo).filter(
                ([_, value]) => value !== null
            )
        );

        let hostData = null;
        const hostVerification = await this.db.hostVerifications.getByUserId(
            sub
        );

        if (hostVerification && hostVerification.status === "approved") {
            const host = await this.db.hosts.getByUserId(sub);

            if (host) {
                const { id, createdAt, updatedAt, ...publicHostInfo } = host;

                hostData = Object.fromEntries(
                    Object.entries(publicHostInfo).filter(
                        ([_, value]) => value !== null
                    )
                );
            }
        }

        const profileData = {
            ...cleanedUserInfo,
            ...(hostData ? { ...hostData, isHost: true } : { isHost: false }),
        };

        console.log("User profile retrieved:", profileData);

        return profileData;
    }

    async updateProfile(request: UpdateUserProfileRequest) {
        const { authorization, ...data } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const user = await this.db.users.getByUserId(sub);

        if (!user) {
            throw new Error(ERRORS.USER.NOT_FOUND.CODE);
        }

        const updatedUser = await this.db.users.update(sub, {
            ...data,
            updatedAt: new Date(),
        });

        console.log("updatedUser", updatedUser);

        return updatedUser;
    }
}
