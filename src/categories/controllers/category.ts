import { CategoryService } from "../services/category";
import { CategoryServiceOptions } from "../types";

import ERRORS from "@/errors";

export class CategoryController {
    private readonly categoryService: CategoryService;

    constructor(opts: CategoryServiceOptions) {
        this.categoryService = new CategoryService(opts);
    }

    async hostGetCategories(request: { authorization: string }) {
        try {
            const result = await this.categoryService.hostGetCategories(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        switch (error.message) {
            case ERRORS.HOST.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.HOST.NOT_FOUND.CODE,
                        message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                    }),
                };

            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }
}
