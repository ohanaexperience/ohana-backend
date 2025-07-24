import { CATEGORIES, SUB_CATEGORIES } from "@/constants/categories";
import { categoriesTable, subCategoriesTable } from "@/database/schemas";
import Postgres from "@/database/postgres";

export async function seedCategories(db: Postgres) {
    try {
        console.log("🌱 Seeding categories...");

        // Get existing categories
        const existingCategories = await db.instance
            .select()
            .from(categoriesTable);
        const existingSlugs = new Set(
            existingCategories.map((cat) => cat.slug)
        );

        // Filter out categories that already exist
        const categoriesToInsert = CATEGORIES.filter(
            (cat) => !existingSlugs.has(cat.slug)
        );

        if (categoriesToInsert.length > 0) {
            // Insert categories with empty image objects
            const insertedCategories = await db.instance
                .insert(categoriesTable)
                .values(
                    categoriesToInsert.map((cat) => ({
                        name: cat.name,
                        slug: cat.slug,
                        image: null, // Empty image object
                    }))
                )
                .returning();

            console.log(
                `✅ Inserted ${insertedCategories.length} new categories`
            );
        } else {
            console.log("ℹ️  All categories already exist");
        }

        // Get all categories for subcategory mapping
        const allCategories = await db.instance.select().from(categoriesTable);
        const categoryMap = new Map(
            allCategories.map((cat) => [cat.slug, cat.id])
        );

        // Get existing subcategories
        const existingSubCategories = await db.instance
            .select()
            .from(subCategoriesTable);

        const existingSubSlugs = new Set(
            existingSubCategories.map((sub) => sub.slug)
        );

        // Filter out subcategories that already exist
        const subCategoriesToInsert = SUB_CATEGORIES.filter(
            (subCat) => !existingSubSlugs.has(subCat.slug)
        );

        if (subCategoriesToInsert.length > 0) {
            // Insert subcategories with empty image objects
            const insertedSubCategories = await db.instance
                .insert(subCategoriesTable)
                .values(
                    subCategoriesToInsert.map((subCat) => ({
                        categoryId: categoryMap.get(subCat.categorySlug)!,
                        name: subCat.name,
                        slug: subCat.slug,
                        image: null, // Empty image object
                    }))
                )
                .returning();

            console.log(
                `✅ Inserted ${insertedSubCategories.length} new subcategories`
            );
        } else {
            console.log("ℹ️  All subcategories already exist");
        }

        console.log("🎉 Categories seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        throw error;
    }
}