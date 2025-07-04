import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import Postgres from "@/database/postgres";
import { HostServiceOptions, GetProfileRequest, UpdateProfileRequest } from "../types";

export class HostService {
    private readonly db: Postgres;

    constructor({ database }: HostServiceOptions) {
        this.db = database;
    }

    async getProfile(request: GetProfileRequest) {
        const { sub } = decodeToken(request.authorization);

        const hostVerification = await this.db.hostVerifications.getByUserId(sub);

        if (!hostVerification) {
            const error = new Error(ERRORS.HOST_VERIFICATION.NOT_VERIFIED.MESSAGE) as any;
            error.__type = ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE;
            error.statusCode = 400;
            throw error;
        }

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            const error = new Error(ERRORS.HOST.NOT_FOUND.MESSAGE) as any;
            error.__type = ERRORS.HOST.NOT_FOUND.CODE;
            error.statusCode = 400;
            throw error;
        }

        const { id, createdAt, updatedAt, ...publicHostInfo } = host;

        const cleanedHostInfo = Object.fromEntries(
            Object.entries(publicHostInfo).filter(
                ([_, value]) => value !== null
            )
        );

        console.log("Host profile retrieved:", cleanedHostInfo);

        return cleanedHostInfo;
    }

    async updateProfile(request: UpdateProfileRequest) {
        const { sub } = decodeToken(request.authorization);
        const { bio, languages } = request;

        console.log("sub", sub);

        const hostVerification = await this.db.hostVerifications.getByUserId(sub);

        if (!hostVerification) {
            const error = new Error(ERRORS.HOST_VERIFICATION.NOT_VERIFIED.MESSAGE) as any;
            error.__type = ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE;
            error.statusCode = 400;
            throw error;
        }

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            const error = new Error(ERRORS.HOST.NOT_FOUND.MESSAGE) as any;
            error.__type = ERRORS.HOST.NOT_FOUND.CODE;
            error.statusCode = 400;
            throw error;
        }

        const updateData: { bio?: string; languages?: string[] } = {};
        if (bio !== undefined) updateData.bio = bio;
        if (languages !== undefined) updateData.languages = languages;

        await this.db.hosts.update(sub, updateData);

        return { message: "Host profile updated successfully." };
    }
}