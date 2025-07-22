import { CATEGORIES, SUB_CATEGORIES } from "@/constants/categories";
import { categoriesTable, subCategoriesTable } from "@/database/schemas";
import Postgres from "@/database/postgres";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { S3Service } from "@/s3/services/s3";
import { S3Client } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import axios from "axios";

export async function seedCategories(db: Postgres) {
    try {
        console.log("🌱 Seeding categories...");

        // Initialize S3 client and service
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || "us-east-1",
        });
        
        const s3Service = new S3Service({
            database: db,
            s3Client,
            bucketName: process.env.S3_BUCKET_NAME || process.env.ASSETS_BUCKET_NAME || "",
            assetsDomain: process.env.CLOUDFRONT_DOMAIN || process.env.ASSETS_CDN_DOMAIN,
        });

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
            // First, insert categories without images to get IDs
            const insertedCategories = await db.instance
                .insert(categoriesTable)
                .values(
                    categoriesToInsert.map((cat) => ({
                        name: cat.name,
                        slug: cat.slug,
                        image: null, // Will update after upload
                    }))
                )
                .returning();

            console.log(
                `✅ Inserted ${insertedCategories.length} new categories`
            );

            // Upload images and update categories
            let uploadedCount = 0;
            for (let i = 0; i < insertedCategories.length; i++) {
                const category = insertedCategories[i];
                const originalCategory = categoriesToInsert[i];

                if (originalCategory.imagePath) {
                    try {
                        const imageId = uuidv4();
                        const s3Key = `categories/${category.id}/images/${imageId}.jpg`;
                        
                        console.log(`📤 Uploading image for ${category.name}...`);
                        
                        // Read the local image file
                        const fullPath = join(
                            process.env.LAMBDA_TASK_ROOT || process.cwd(),
                            "assets",
                            originalCategory.imagePath
                        );

                        if (!existsSync(fullPath)) {
                            console.warn(`Image not found: ${fullPath}`);
                            continue;
                        }

                        const fileContent = readFileSync(fullPath);
                        const extension = extname(originalCategory.imagePath).toLowerCase();
                        const mimeTypes: Record<string, string> = {
                            ".jpg": "image/jpeg",
                            ".jpeg": "image/jpeg",
                            ".png": "image/png",
                            ".gif": "image/gif",
                            ".webp": "image/webp",
                        };
                        const mimeType = mimeTypes[extension] || "image/jpeg";

                        // Generate presigned URL
                        const presignedUrl = await s3Service.generatePresignedUploadUrl({
                            key: s3Key,
                            mimeType: mimeType,
                        });

                        // Upload the file using the presigned URL
                        await axios.put(presignedUrl, fileContent, {
                            headers: {
                                'Content-Type': mimeType,
                            },
                        });

                        // Get the public URL
                        const publicUrl = s3Service.getPublicUrl(s3Key);

                        const imageObject = {
                            id: imageId,
                            key: s3Key,
                            url: publicUrl,
                            mimeType: mimeType,
                        };

                        // Update category with uploaded image
                        await db.instance
                            .update(categoriesTable)
                            .set({ image: imageObject })
                            .where(eq(categoriesTable.id, category.id));
                        
                        uploadedCount++;
                        console.log(`✅ Uploaded image for ${category.name}`);
                    } catch (error) {
                        console.error(`Failed to upload image for ${category.name}:`, error);
                    }
                }
            }

            if (uploadedCount > 0) {
                console.log(
                    `📸 ${uploadedCount} category images uploaded successfully`
                );
            }
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
            // First, insert subcategories without images to get IDs
            const insertedSubCategories = await db.instance
                .insert(subCategoriesTable)
                .values(
                    subCategoriesToInsert.map((subCat) => ({
                        categoryId: categoryMap.get(subCat.categorySlug)!,
                        name: subCat.name,
                        slug: subCat.slug,
                        image: null, // Will update after upload
                    }))
                )
                .returning();

            console.log(
                `✅ Inserted ${insertedSubCategories.length} new subcategories`
            );

            // Upload images and update subcategories
            let uploadedSubCount = 0;
            for (let i = 0; i < insertedSubCategories.length; i++) {
                const subCategory = insertedSubCategories[i];
                const originalSubCategory = subCategoriesToInsert[i];

                if (originalSubCategory.imagePath) {
                    try {
                        const imageId = uuidv4();
                        const s3Key = `subcategories/${subCategory.id}/images/${imageId}.jpg`;
                        
                        console.log(`📤 Uploading image for ${subCategory.name}...`);
                        
                        // Read the local image file
                        const fullPath = join(
                            process.env.LAMBDA_TASK_ROOT || process.cwd(),
                            "assets",
                            originalSubCategory.imagePath
                        );

                        if (!existsSync(fullPath)) {
                            console.warn(`Image not found: ${fullPath}`);
                            continue;
                        }

                        const fileContent = readFileSync(fullPath);
                        const extension = extname(originalSubCategory.imagePath).toLowerCase();
                        const mimeTypes: Record<string, string> = {
                            ".jpg": "image/jpeg",
                            ".jpeg": "image/jpeg",
                            ".png": "image/png",
                            ".gif": "image/gif",
                            ".webp": "image/webp",
                        };
                        const mimeType = mimeTypes[extension] || "image/jpeg";

                        // Generate presigned URL
                        const presignedUrl = await s3Service.generatePresignedUploadUrl({
                            key: s3Key,
                            mimeType: mimeType,
                        });

                        // Upload the file using the presigned URL
                        await axios.put(presignedUrl, fileContent, {
                            headers: {
                                'Content-Type': mimeType,
                            },
                        });

                        // Get the public URL
                        const publicUrl = s3Service.getPublicUrl(s3Key);

                        const imageObject = {
                            id: imageId,
                            key: s3Key,
                            url: publicUrl,
                            mimeType: mimeType,
                        };

                        // Update subcategory with uploaded image
                        await db.instance
                            .update(subCategoriesTable)
                            .set({ image: imageObject })
                            .where(eq(subCategoriesTable.id, subCategory.id));
                        
                        uploadedSubCount++;
                        console.log(`✅ Uploaded image for ${subCategory.name}`);
                    } catch (error) {
                        console.error(`Failed to upload image for ${subCategory.name}:`, error);
                    }
                }
            }

            if (uploadedSubCount > 0) {
                console.log(
                    `📸 ${uploadedSubCount} subcategory images uploaded successfully`
                );
            }
        } else {
            console.log("ℹ️  All subcategories already exist");
        }

        console.log("🎉 Categories seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        throw error;
    }
}