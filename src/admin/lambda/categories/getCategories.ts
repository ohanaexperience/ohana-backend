import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireAdmin } from "@/middleware";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const adminController = new AdminController({ database });

export const handler = middy(async () => {
    return await adminController.getCategories();
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireAdmin())
    .use(cors());