#!/usr/bin/env node

/**
 * Cleanup Test Users Script
 * 
 * This script helps clean up test users created during e2e testing
 */

const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const USER_POOL_ID = 'us-east-1_lOVfEVcpD'; // ohana-user-pool-dev
const REGION = 'us-east-1';

class TestUserCleanup {
    constructor() {
        this.cognitoClient = new CognitoIdentityProviderClient({
            region: REGION,
            // Will use your AWS profile (add profile if needed)
        });
    }

    /**
     * List all test users in the user pool
     */
    async listTestUsers(pattern = 'test-user-') {
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
        } catch (error) {
            console.error('Error listing users:', error.message);
            if (error.name === 'CredentialsProviderError') {
                console.error('\n💡 Make sure you have AWS credentials configured:');
                console.error('   - Run: aws configure --profile ohana-deployer');
                console.error('   - Or set AWS_PROFILE=ohana-deployer environment variable');
            }
            throw error;
        }
    }

    /**
     * Delete a specific user
     */
    async deleteUser(username) {
        try {
            const command = new AdminDeleteUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: username,
            });

            await this.cognitoClient.send(command);
            console.log(`✅ Deleted user: ${username}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to delete user ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Clean up test users
     */
    async cleanup(options = {}) {
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
                const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
                const status = user.UserStatus;
                const created = user.UserCreateDate?.toISOString();
                console.log(`   ${index + 1}. ${email} (${status}) - Created: ${created}`);
            });

            if (dryRun) {
                console.log('\n🔍 DRY RUN - No users were actually deleted');
                console.log('Run without --dry-run to actually delete these users');
                return;
            }

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

        } catch (error) {
            console.error('🚨 Cleanup failed:', error.message);
            throw error;
        }
    }

    /**
     * Show usage information
     */
    static showUsage() {
        console.log(`
🧹 Test User Cleanup Tool

Usage:
  node scripts/cleanup-test-users.js [options]

Options:
  --dry-run           Show what would be deleted without actually deleting
  --pattern <text>    Pattern to match in email addresses (default: "test-user-")
  --max <number>      Maximum number of users to delete (default: 50)
  --help             Show this help message

Examples:
  # Dry run to see what would be deleted
  node scripts/cleanup-test-users.js --dry-run

  # Delete all test users with default pattern
  node scripts/cleanup-test-users.js

  # Delete users with custom pattern
  node scripts/cleanup-test-users.js --pattern "example.com"

  # Delete only 10 users max
  node scripts/cleanup-test-users.js --max 10

NPM Scripts:
  npm run cleanup:users:dry    # Dry run
  npm run cleanup:users        # Actually delete
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

    const options = {
        dryRun: args.includes('--dry-run'),
        userPattern: args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : 'test-user-',
        maxUsers: args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1]) : 50,
    };

    const cleanup = new TestUserCleanup();
    
    try {
        await cleanup.cleanup(options);
    } catch (error) {
        console.error('Script failed:', error.message);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { TestUserCleanup };