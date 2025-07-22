import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";

import { ImageObject } from "@/types/experiences";

export const categoriesTable = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    image: jsonb("image").$type<ImageObject>(),
});

export const subCategoriesTable = pgTable("sub_categories", {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
        .references(() => categoriesTable.id)
        .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    image: jsonb("image").$type<ImageObject>(),
});
