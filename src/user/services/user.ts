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

        // Separate user fields from host fields
        const { bio, languages, ...userFields } = data;

        // Update user fields if any
        if (Object.keys(userFields).length > 0) {
            await this.db.users.update(sub, {
                ...userFields,
                updatedAt: new Date(),
            });
        }

        // Update host fields if any and user is a verified host
        if (bio !== undefined || languages !== undefined) {
            const hostVerification =
                await this.db.hostVerifications.getByUserId(sub);

            if (!hostVerification || hostVerification.status !== "approved") {
                throw new Error(ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE);
            }

            const host = await this.db.hosts.getByUserId(sub);

            if (!host) {
                throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
            }

            const hostUpdateData: {
                bio?: string;
                languages?: string[];
                updatedAt: Date;
            } = {
                updatedAt: new Date(),
            };
            if (bio !== undefined) hostUpdateData.bio = bio;
            if (languages !== undefined) hostUpdateData.languages = languages;

            await this.db.hosts.update(sub, hostUpdateData);
        }

        // Return the updated profile (including host data if applicable)
        return this.getProfile({ authorization });
    }
}
