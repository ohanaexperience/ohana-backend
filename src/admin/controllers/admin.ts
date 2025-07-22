import { AdminService, AdminServiceOptions } from "../services/admin";
import ERRORS from "@/errors";

export class AdminController {
    private readonly adminService: AdminService;

    constructor(opts: AdminServiceOptions) {
        this.adminService = new AdminService(opts);
    }

    async getCategories() {
        try {
            const result = await this.adminService.getCategories();

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async createCategory(request: {
        authorization: string;
        name: string;
        slug: string;
        imageMimeType?: string;
    }) {
        try {
            const result = await this.adminService.createCategory(request);

            return {
                statusCode: 201,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async createSubCategory(request: {
        authorization: string;
        categoryId: number;
        name: string;
        slug: string;
        imageMimeType?: string;
    }) {
        try {
            const result = await this.adminService.createSubCategory(request);

            return {
                statusCode: 201,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getCategoryImageUploadUrl(request: {
        authorization: string;
        categoryId: number;
        mimeType: string;
    }) {
        try {
            const result = await this.adminService.getCategoryImageUploadUrl(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async updateCategoryImage(request: {
        authorization: string;
        categoryId: number;
        imageId: string;
        imageUrl: string;
        key: string;
        mimeType: string;
    }) {
        try {
            const result = await this.adminService.updateCategoryImage(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async deleteCategoryImage(request: {
        authorization: string;
        categoryId: number;
    }) {
        try {
            const result = await this.adminService.deleteCategoryImage(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getSubCategoryImageUploadUrl(request: {
        authorization: string;
        subCategoryId: number;
        mimeType: string;
    }) {
        try {
            const result = await this.adminService.getSubCategoryImageUploadUrl(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async updateSubCategoryImage(request: {
        authorization: string;
        subCategoryId: number;
        imageId: string;
        imageUrl: string;
        key: string;
        mimeType: string;
    }) {
        try {
            const result = await this.adminService.updateSubCategoryImage(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async deleteSubCategoryImage(request: {
        authorization: string;
        subCategoryId: number;
    }) {
        try {
            const result = await this.adminService.deleteSubCategoryImage(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async featureExperience(request: {
        authorization: string;
        experienceId: string;
        featuredOrder?: number;
    }) {
        try {
            const result = await this.adminService.featureExperience(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async unfeatureExperience(request: {
        authorization: string;
        experienceId: string;
    }) {
        try {
            const result = await this.adminService.unfeatureExperience(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }


    private handleError(error: any) {
        console.error("Admin controller error:", error);

        if (error.__type) {
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify({
                    error: error.__type,
                    message: error.message,
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
}