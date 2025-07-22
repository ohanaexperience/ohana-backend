import { eq, InferInsertModel, SQL, ilike, and, sql } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { hostsTable, usersTable, hostVerificationsTable } from "@/database/schemas";

export class HostsQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(hostsTable)
        );
    }

    public async getByUserId(userId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(hostsTable)
                .where(eq(hostsTable.id, userId))
                .limit(1);

            return results[0] || null;
        });
    }

    public async create(data: InsertHost) {
        return await this.withDatabase(async (db) =>
            db.insert(hostsTable).values(data).returning()
        );
    }

    public async update(userId: string, data: UpdateHost) {
        return await this.withDatabase(async (db) =>
            db.update(hostsTable)
                .set(data)
                .where(eq(hostsTable.id, userId))
                .returning()
        );
    }

    public async delete(userId: string) {
        return await this.withDatabase(async (db) =>
            db.delete(hostsTable)
                .where(eq(hostsTable.id, userId))
        );
    }

    public async searchHosts(filters: Record<string, any>) {
        return await this.withDatabase(async (db) => {
            const conditions: SQL[] = [];

            // Only show active hosts
            conditions.push(eq(hostsTable.isActive, true));

            // Text search filters
            if (filters.bio) {
                conditions.push(ilike(hostsTable.bio, `%${filters.bio}%`));
            }

            // Language filter - matches if any language in the filter array is in the host's languages
            if (filters.languages && Array.isArray(filters.languages) && filters.languages.length > 0) {
                const languageConditions = filters.languages.map((lang: string) => 
                    sql`${lang} = ANY(${hostsTable.languages})`
                );
                conditions.push(sql`(${sql.join(languageConditions, sql` OR `)})`);
            }

            // Join with users and hostVerifications to get complete host info
            const query = db
                .select({
                    id: hostsTable.id,
                    bio: hostsTable.bio,
                    languages: hostsTable.languages,
                    socials: hostsTable.socials,
                    isActive: hostsTable.isActive,
                    createdAt: hostsTable.createdAt,
                    updatedAt: hostsTable.updatedAt,
                    // User info
                    email: usersTable.email,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    profileImage: usersTable.profileImage,
                    // Verification status
                    verificationStatus: hostVerificationsTable.status,
                })
                .from(hostsTable)
                .innerJoin(usersTable, eq(hostsTable.id, usersTable.id))
                .innerJoin(hostVerificationsTable, eq(hostsTable.id, hostVerificationsTable.userId))
                .where(and(
                    ...conditions,
                    eq(hostVerificationsTable.status, 'approved') // Only show approved hosts
                ));

            // Apply limit and offset if provided
            if (filters.limit) {
                query.limit(filters.limit);
            }
            if (filters.offset) {
                query.offset(filters.offset);
            }

            return await query;
        });
    }
}

export type InsertHost = InferInsertModel<typeof hostsTable>;
export type UpdateHost = Partial<Omit<InsertHost, "id">>;
