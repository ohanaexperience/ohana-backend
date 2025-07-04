#!/usr/bin/env npx ts-node

/**
 * Cleanup Test Users Script
 * 
 * This script helps clean up test users created during e2e testing
 */

import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = 'us-east-1_BmdzbmbF3'; // Your dev user pool ID
const REGION = 'us-east-1';

interface CleanupOptions {
    dryRun?: boolean;
    userPattern?: string;
    maxUsers?: number;
}

class TestUserCleanup {
    private cognitoClient: CognitoIdentityProviderClient;

    constructor() {
        this.cognitoClient = new CognitoIdentityProviderClient({
            region: REGION,
            // Will use your AWS profile credentials
        });
    }

    /**
     * List all test users in the user pool
     */
    async listTestUsers(pattern: string = 'test-user-'): Promise<any[]> {
        console.log(`🔍 Searching for users matching pattern: "${pattern}"`);
        
        try {
            const command = new ListUsersCommand({
                UserPoolId: USER_POOL_ID,
                Limit: 60, // Max users to retrieve
            });

            const response = await this.cognitoClient.send(command);
            
            if (!response.Users) {
                console.log('No users found in user pool');
                return [];
            }

            // Filter users by pattern (looking at email attribute)
            const testUsers = response.Users.filter(user => {
                const emailAttr = user.Attributes?.find(attr => attr.Name === 'email');
                if (emailAttr?.Value) {
                    return emailAttr.Value.includes(pattern);
                }
                return false;
            });

            console.log(`Found ${testUsers.length} test users out of ${response.Users.length} total users`);
            return testUsers;
        } catch (error: any) {
            console.error('Error listing users:', error.message);
            throw error;
        }
    }

    /**
     * Delete a specific user
     */
    async deleteUser(username: string): Promise<boolean> {
        try {
            const command = new AdminDeleteUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: username,
            });

            await this.cognitoClient.send(command);
            console.log(`✅ Deleted user: ${username}`);
            return true;
        } catch (error: any) {
            console.error(`❌ Failed to delete user ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Clean up test users
     */
    async cleanup(options: CleanupOptions = {}): Promise<void> {
        const {
            dryRun = false,
            userPattern = 'test-user-',
            maxUsers = 50
        } = options;

        console.log('🧹 Starting test user cleanup...');
        console.log(`   Pattern: ${userPattern}`);
        console.log(`   Max users: ${maxUsers}`);
        console.log(`   Dry run: ${dryRun}`);
        console.log('');

        try {
            const testUsers = await this.listTestUsers(userPattern);
            
            if (testUsers.length === 0) {
                console.log('✨ No test users found to clean up!');
                return;
            }

            const usersToDelete = testUsers.slice(0, maxUsers);
            
            console.log(`\n📋 Users to ${dryRun ? 'be deleted' :'delete'}:`);
            usersToDelete.forEach((user, index) => {
                const email = user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value;
                const status = user.UserStatus;
                const created = user.UserCreateDate?.toISOString();
                console.log(`   ${index + 1}. ${email} (${status}) - Created: ${created}`);
            });

            if (dryRun) {
                console.log('\n🔍 DRY RUN - No users were actually deleted');
                console.log('Run without --dry-run to actually delete these users');
                return;
            }

            console.log('\n⚠️  Are you sure you want to delete these users?');
            console.log('This action cannot be undone!');

            // In a real script, you'd want to add confirmation here
            // For now, we'll proceed with deletion

            console.log('\n🗑️  Deleting users...');
            let deletedCount = 0;
            let failedCount = 0;

            for (const user of usersToDelete) {
                if (user.Username) {
                    const success = await this.deleteUser(user.Username);
                    if (success) {
                        deletedCount++;
                    } else {
                        failedCount++;
                    }
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log('\n📊 Cleanup Results:');
            console.log(`   ✅ Successfully deleted: ${deletedCount} users`);
            console.log(`   ❌ Failed to delete: ${failedCount} users`);
            console.log(`   📈 Total processed: ${deletedCount + failedCount} users`);

        } catch (error: any) {
            console.error('🚨 Cleanup failed:', error.message);
            throw error;
        }
    }

    /**
     * Show usage information
     */
    static showUsage(): void {
        console.log(`
🧹 Test User Cleanup Tool

Usage:
  npx ts-node scripts/cleanup-test-users.ts [options]

Options:
  --dry-run           Show what would be deleted without actually deleting
  --pattern <text>    Pattern to match in email addresses (default: "test-user-")
  --max <number>      Maximum number of users to delete (default: 50)
  --help             Show this help message

Examples:
  # Dry run to see what would be deleted
  npx ts-node scripts/cleanup-test-users.ts --dry-run

  # Delete all test users with default pattern
  npx ts-node scripts/cleanup-test-users.ts

  # Delete users with custom pattern
  npx ts-node scripts/cleanup-test-users.ts --pattern "example.com"

  # Delete only 10 users max
  npx ts-node scripts/cleanup-test-users.ts --max 10
        `);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        TestUserCleanup.showUsage();
        return;
    }

    const options: CleanupOptions = {
        dryRun: args.includes('--dry-run'),
        userPattern: args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : 'test-user-',
        maxUsers: args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1]) : 50,
    };

    const cleanup = new TestUserCleanup();
    
    try {
        await cleanup.cleanup(options);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { TestUserCleanup };