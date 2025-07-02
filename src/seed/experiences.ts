import { CATEGORIES, SUB_CATEGORIES } from "@/constants/categories";
import { experiencesTable } from "@/db/schema";
import Postgres from "@/database/postgres";

export async function seedExperiences(db: Postgres) {
    try {
        console.log("🌱 Seeding experiences...");

        // Get existing categories
        const existingCategories = await db.instance
            .select()
            .from(experiencesTable);
        const existingSlugs = new Set(
            existingCategories.map((cat) => cat.slug)
        );

        // Filter out categories that already exist
        const newCategories = CATEGORIES.filter(
            (cat) => !existingSlugs.has(cat.slug)
        );

        if (newCategories.length > 0) {
            const insertedCategories = await db.instance
                .insert(experiencesTable)
                .values(newCategories)
                .returning();
            console.log(
                `✅ Inserted ${insertedCategories.length} new categories`
            );
        } else {
            console.log("ℹ️  All categories already exist");
        }

        // Get all categories for subcategory mapping
        const allCategories = await db.instance.select().from(experiencesTable);
        const categoryMap = new Map(
            allCategories.map((cat) => [cat.slug, cat.id])
        );

        // Get existing subcategories
        const existingSubCategories = await db.instance
            .select()
            .from(subCategoriesTable);
        0;

        const existingSubSlugs = new Set(
            existingSubCategories.map((sub) => sub.slug)
        );

        // Filter out subcategories that already exist
        const newSubCategories = subCategories
            .filter((subCat) => !existingSubSlugs.has(subCat.slug))
            .map((subCat) => ({
                categoryId: categoryMap.get(subCat.categorySlug)!,
                name: subCat.name,
                slug: subCat.slug,
            }));

        if (newSubCategories.length > 0) {
            const insertedSubCategories = await db.instance
                .insert(subCategoriesTable)
                .values(newSubCategories)
                .returning();
            console.log(
                `✅ Inserted ${insertedSubCategories.length} new subcategories`
            );
        } else {
            console.log("ℹ️  All subcategories already exist");
        }

        console.log("🎉 Experiences seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding experiences:", error);
        throw error;
    }
}
