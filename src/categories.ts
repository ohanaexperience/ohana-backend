import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import DatabaseFactory from "@/database/database_factory";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

const { DB_ENDPOINT, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: false,
    },
});

export const getCategories = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    console.log("event", event);

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    try {
        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await db.hosts.getByUserId(sub);

        if (!host) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.HOST.NOT_FOUND.CODE,
                    message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                }),
            };
        }

        const categories = await db.categories.getAll();
        const subCategories = await db.subCategories.getAll();
        const subCategoriesByParent = new Map();

        subCategories.forEach((subCat) => {
            if (!subCategoriesByParent.has(subCat.categoryId)) {
                subCategoriesByParent.set(subCat.categoryId, []);
            }

            subCategoriesByParent.get(subCat.categoryId).push(subCat);
        });

        const categoriesWithSubs = categories.map((category) => ({
            ...category,
            subCategories: subCategoriesByParent.get(category.id) || [],
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(categoriesWithSubs),
        };
    } catch (err: any) {
        console.error("Error getting categories:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                message: "An unexpected error occurred",
            }),
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(cors());
