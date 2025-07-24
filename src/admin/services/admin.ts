import { v4 as uuidv4 } from "uuid";
import { extension } from "mime-types";

import Postgres from "@/database/postgres";
import { S3Service } from "@/s3/services/s3";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import { ImageObject } from "@/types/experiences";

export interface AdminServiceOptions {
    database: Postgres;
    s3Service?: S3Service;
}

export class AdminService {
    private readonly db: Postgres;
    private readonly s3Service?: S3Service;

    constructor({ database, s3Service }: AdminServiceOptions) {
        this.db = database;
        this.s3Service = s3Service;
    }

    // Category Management
    async getCategories() {
        const categories = await this.db.categories.getAll();
        const categoriesWithSubcategories = await Promise.all(
            categories.map(async (category) => {
                const subcategories = await this.db.subCategories.getByCategoryId(category.id);
                return {
                    ...category,
                    subcategories,
                };
            })
        );
        return categoriesWithSubcategories;
    }

    async createCategory(request: {
        authorization: string;
        name: string;
        slug: string;
        imageMimeType?: string;
    }) {
        const { authorization, name, slug, imageMimeType } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        // Check if category with slug already exists
        const existingCategory = await this.db.categories.getBySlug(slug);
        if (existingCategory) {
            throw new Error("Category with this slug already exists");
        }

        // Create the category
        const category = await this.db.categories.create({
            name,
            slug,
            image: null, // Will be updated by S3 trigger if image is uploaded
        });

        if (!category) {
            throw new Error("Failed to create category");
        }

        // Generate upload URL if image mime type is provided
        let uploadInfo = null;
        if (imageMimeType && this.s3Service) {
            const fileExtension = extension(imageMimeType);
            const imageId = uuidv4();
            const fileName = `${imageId}.${fileExtension}`;
            const key = `categories/${category.id}/images/${fileName}`;

            const uploadUrl = await this.s3Service.generatePresignedUploadUrl({
                key,
                mimeType: imageMimeType,
            });

            uploadInfo = {
                uploadUrl,
                imageId,
                key,
            };
        }

        return {
            category,
            uploadInfo,
        };
    }

    async getCategoryImageUploadUrl(request: {
        categoryId: number;
        mimeType: string;
    }) {
        const { categoryId, mimeType } = request;

        const category = await this.db.categories.getById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        if (!this.s3Service) {
            throw new Error("S3 service not configured");
        }

        const fileExtension = extension(mimeType);
        const imageId = uuidv4();
        const fileName = `${imageId}.${fileExtension}`;
        const key = `categories/${categoryId}/images/${fileName}`;

        const uploadUrl = await this.s3Service.generatePresignedUploadUrl({
            key,
            mimeType,
        });

        const imageUrl = this.s3Service.getPublicUrl(key);

        return {
            uploadUrl,
            imageId,
            imageUrl,
            key,
            mimeType,
        };
    }

    async updateCategoryImage(request: {
        authorization: string;
        categoryId: number;
        imageId: string;
        imageUrl: string;
        key: string;
        mimeType: string;
    }) {
        const { authorization, categoryId, imageId, imageUrl, key, mimeType } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const category = await this.db.categories.getById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Delete old image if exists
        if (category.image && this.s3Service) {
            await this.s3Service.deleteObject(category.image.key);
        }

        const imageObject: ImageObject = {
            id: imageId,
            url: imageUrl,
            key,
            mimeType,
        };

        await this.db.categories.update(categoryId, {
            image: imageObject,
        });

        return {
            message: "Category image updated successfully",
            image: imageObject,
        };
    }

    async deleteCategoryImage(request: {
        authorization: string;
        categoryId: number;
    }) {
        const { authorization, categoryId } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const category = await this.db.categories.getById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        if (category.image && this.s3Service) {
            await this.s3Service.deleteObject(category.image.key);
        }

        await this.db.categories.update(categoryId, {
            image: null,
        });

        return {
            message: "Category image deleted successfully",
        };
    }

    // Subcategory Management
    async createSubCategory(request: {
        authorization: string;
        categoryId: number;
        name: string;
        slug: string;
        imageMimeType?: string;
    }) {
        const { authorization, categoryId, name, slug, imageMimeType } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        // Check if category exists
        const category = await this.db.categories.getById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Check if subcategory with slug already exists
        const existingSubCategory = await this.db.subCategories.getBySlug(slug);
        if (existingSubCategory) {
            throw new Error("Subcategory with this slug already exists");
        }

        // Create the subcategory
        const subCategory = await this.db.subCategories.create({
            categoryId,
            name,
            slug,
            image: null, // Will be updated by S3 trigger if image is uploaded
        });

        if (!subCategory) {
            throw new Error("Failed to create subcategory");
        }

        // Generate upload URL if image mime type is provided
        let uploadInfo = null;
        if (imageMimeType && this.s3Service) {
            const fileExtension = extension(imageMimeType);
            const imageId = uuidv4();
            const fileName = `${imageId}.${fileExtension}`;
            const key = `subcategories/${subCategory.id}/images/${fileName}`;

            const uploadUrl = await this.s3Service.generatePresignedUploadUrl({
                key,
                mimeType: imageMimeType,
            });

            uploadInfo = {
                uploadUrl,
                imageId,
                key,
            };
        }

        return {
            subCategory,
            uploadInfo,
        };
    }

    async getSubCategoryImageUploadUrl(request: {
        subCategoryId: number;
        mimeType: string;
    }) {
        const { subCategoryId, mimeType } = request;

        const subCategory = await this.db.subCategories.getById(subCategoryId);
        if (!subCategory) {
            throw new Error("Subcategory not found");
        }

        if (!this.s3Service) {
            throw new Error("S3 service not configured");
        }

        const fileExtension = extension(mimeType);
        const imageId = uuidv4();
        const fileName = `${imageId}.${fileExtension}`;
        const key = `subcategories/${subCategoryId}/images/${fileName}`;

        const uploadUrl = await this.s3Service.generatePresignedUploadUrl({
            key,
            mimeType,
        });

        const imageUrl = this.s3Service.getPublicUrl(key);

        return {
            uploadUrl,
            imageId,
            imageUrl,
            key,
            mimeType,
        };
    }

    async updateSubCategoryImage(request: {
        authorization: string;
        subCategoryId: number;
        imageId: string;
        imageUrl: string;
        key: string;
        mimeType: string;
    }) {
        const { authorization, subCategoryId, imageId, imageUrl, key, mimeType } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const subCategory = await this.db.subCategories.getById(subCategoryId);
        if (!subCategory) {
            throw new Error("Subcategory not found");
        }

        // Delete old image if exists
        if (subCategory.image && this.s3Service) {
            await this.s3Service.deleteObject(subCategory.image.key);
        }

        const imageObject: ImageObject = {
            id: imageId,
            url: imageUrl,
            key,
            mimeType,
        };

        await this.db.subCategories.update(subCategoryId, {
            image: imageObject,
        });

        return {
            message: "Subcategory image updated successfully",
            image: imageObject,
        };
    }

    async deleteSubCategoryImage(request: {
        authorization: string;
        subCategoryId: number;
    }) {
        const { authorization, subCategoryId } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const subCategory = await this.db.subCategories.getById(subCategoryId);
        if (!subCategory) {
            throw new Error("Subcategory not found");
        }

        if (subCategory.image && this.s3Service) {
            await this.s3Service.deleteObject(subCategory.image.key);
        }

        await this.db.subCategories.update(subCategoryId, {
            image: null,
        });

        return {
            message: "Subcategory image deleted successfully",
        };
    }

    async featureExperience(request: {
        authorization: string;
        experienceId: string;
        featuredOrder?: number;
    }) {
        const { authorization, experienceId, featuredOrder } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw ERRORS.EXPERIENCE.NOT_FOUND;
        }

        const updatedExperience = await this.db.experiences.setFeatured(
            experienceId,
            featuredOrder
        );

        return {
            experience: updatedExperience,
            message: "Experience featured successfully",
        };
    }

    async unfeatureExperience(request: {
        authorization: string;
        experienceId: string;
    }) {
        const { authorization, experienceId } = request;

        // Verify admin authorization
        const { sub } = decodeToken(authorization);
        // TODO: Add admin role check here

        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw ERRORS.EXPERIENCE.NOT_FOUND;
        }

        const updatedExperience = await this.db.experiences.removeFeatured(experienceId);

        return {
            experience: updatedExperience,
            message: "Experience unfeatured successfully",
        };
    }
}