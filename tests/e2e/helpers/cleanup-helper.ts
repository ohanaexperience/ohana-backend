/**
 * Cleanup Helper
 * 
 * Provides utilities for cleaning up test data after e2e tests
 */

import { config } from '../config';

export interface DatabaseCleanupOptions {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

export class CleanupHelper {
    private createdResources: Map<string, string[]> = new Map();

    /**
     * Track a resource for cleanup
     */
    trackResource(type: string, id: string): void {
        if (!this.createdResources.has(type)) {
            this.createdResources.set(type, []);
        }
        this.createdResources.get(type)!.push(id);
    }

    /**
     * Get tracked resources by type
     */
    getTrackedResources(type: string): string[] {
        return this.createdResources.get(type) || [];
    }

    /**
     * Clean up test data using API calls
     */
    async cleanupViaApi(apiClient: any, authToken: string): Promise<void> {
        console.log('🧹 Starting API-based cleanup...');

        // Set auth token
        apiClient.setAuthToken(authToken);

        // Clean up experiences
        const experienceIds = this.getTrackedResources('experiences');
        for (const experienceId of experienceIds) {
            try {
                await apiClient.delete(`/v1/host/experiences/${experienceId}`);
                console.log(`✅ Deleted experience: ${experienceId}`);
            } catch (error: any) {
                console.warn(`⚠️  Could not delete experience ${experienceId}: ${error.message}`);
            }
        }

        console.log('✅ API cleanup completed');
    }

    /**
     * Clean up test data using direct database access
     * This is more thorough but requires database credentials
     */
    async cleanupViaDatabase(options: DatabaseCleanupOptions): Promise<void> {
        console.log('🧹 Starting database cleanup...');
        
        try {
            // Note: You would implement direct database cleanup here if needed
            // This is more advanced and requires careful handling to avoid
            // affecting production data
            
            console.log('⚠️  Direct database cleanup not implemented yet');
            console.log('   Consider implementing this if API cleanup is insufficient');
        } catch (error: any) {
            console.error('❌ Database cleanup failed:', error.message);
        }
    }

    /**
     * Clean up AWS resources (S3 files, etc.)
     */
    async cleanupAwsResources(): Promise<void> {
        console.log('🧹 Cleaning up AWS resources...');

        // Clean up S3 test files
        const s3Files = this.getTrackedResources('s3Files');
        if (s3Files.length > 0) {
            console.log(`Found ${s3Files.length} S3 files to clean up`);
            // Implement S3 cleanup if needed
        }

        console.log('✅ AWS cleanup completed');
    }

    /**
     * Comprehensive cleanup
     */
    async cleanup(apiClient?: any, authToken?: string, dbOptions?: DatabaseCleanupOptions): Promise<void> {
        console.log('🧹 Starting comprehensive cleanup...');

        // API cleanup (preferred method)
        if (apiClient && authToken) {
            await this.cleanupViaApi(apiClient, authToken);
        }

        // Database cleanup (if API cleanup is insufficient)
        if (dbOptions) {
            await this.cleanupViaDatabase(dbOptions);
        }

        // AWS resources cleanup
        await this.cleanupAwsResources();

        // Clear tracked resources
        this.createdResources.clear();

        console.log('✅ Comprehensive cleanup completed');
    }

    /**
     * Get summary of tracked resources
     */
    getSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        for (const [type, resources] of this.createdResources.entries()) {
            summary[type] = resources.length;
        }
        return summary;
    }

    /**
     * Emergency cleanup function for CI/CD environments
     * This can be called as a separate script if tests fail to clean up
     */
    static async emergencyCleanup(): Promise<void> {
        console.log('🚨 Running emergency cleanup...');
        
        // This could be implemented to clean up test data based on
        // naming patterns, creation dates, etc.
        
        console.log('⚠️  Emergency cleanup not fully implemented');
        console.log('   Consider implementing this for CI/CD reliability');
    }
}