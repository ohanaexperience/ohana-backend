import { CategoryService } from "../services/category";
import { CategoryServiceOptions } from "../types";

export class CategoryController {
    private readonly categoryService: CategoryService;

    constructor(opts: CategoryServiceOptions) {
        this.categoryService = new CategoryService(opts);
    }

    async getCategories() {
        try {
            const result = await this.categoryService.getCategories();

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        console.log("CategoryController error", error);

        switch (error.message) {
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
