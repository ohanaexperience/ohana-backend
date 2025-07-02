import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
});

export const subCategoriesTable = pgTable("sub_categories", {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
        .references(() => categoriesTable.id)
        .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
});
