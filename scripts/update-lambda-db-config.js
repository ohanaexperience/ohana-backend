#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Function files to update
const functionFiles = [
    'auth.yml',
    'database.yml',
    'user.yml',
    'stripe.yml',
    'host.yml',
    'webhooks.yml',
    'experiences.yml',
    'time_slots.yml',
    'reservations.yml',
    'categories.yml',
    'admin.yml',
    'triggers.yml',
    'reviews.yml'
];

// New environment configuration for database access
const newDbEnvironment = {
    POSTGRES_DB: '${self:custom.resourceNames.postgresDB}',
    POSTGRES_USERNAME: '${env:POSTGRES_USERNAME}',
    POSTGRES_PASSWORD: '${env:POSTGRES_PASSWORD}',
    USE_RDS_PROXY: '${self:custom.useRdsProxy.${self:provider.stage}}',
    RDS_PROXY_ENDPOINT: {
        'Fn::If': [
            'IsProduction',
            { 'Fn::GetAtt': ['PostgresRDSProxy', 'Endpoint'] },
            ''
        ]
    },
    RDS_CLUSTER_ENDPOINT: { 'Fn::GetAtt': ['PostgresRDSServerlessCluster', 'Endpoint.Address'] },
    RDS_CLUSTER_PORT: { 'Fn::GetAtt': ['PostgresRDSServerlessCluster', 'Endpoint.Port'] }
};

function updateFunctionFile(fileName) {
    const filePath = path.join(__dirname, '..', 'functions', fileName);
    
    try {
        // Read the YAML file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const config = yaml.load(fileContent);
        
        let updated = false;
        
        // Update each function in the file
        Object.keys(config).forEach(functionName => {
            const func = config[functionName];
            
            // Skip if not a function configuration
            if (!func || typeof func !== 'object' || !func.handler) {
                return;
            }
            
            // Check if function has database-related environment variables
            if (func.environment && (
                func.environment.RDS_PROXY_ENDPOINT ||
                func.environment.POSTGRES_DB ||
                func.environment.USE_RDS_PROXY !== undefined
            )) {
                console.log(`Updating ${functionName} in ${fileName}`);
                
                // Preserve non-database environment variables
                const preservedEnv = {};
                Object.keys(func.environment).forEach(key => {
                    if (!['RDS_PROXY_ENDPOINT', 'POSTGRES_DB', 'POSTGRES_USERNAME', 
                           'POSTGRES_PASSWORD', 'USE_RDS_PROXY', 'RDS_CLUSTER_ENDPOINT', 
                           'RDS_CLUSTER_PORT'].includes(key)) {
                        preservedEnv[key] = func.environment[key];
                    }
                });
                
                // Merge with new database environment
                func.environment = {
                    ...newDbEnvironment,
                    ...preservedEnv
                };
                
                updated = true;
            }
        });
        
        if (updated) {
            // Write back the updated YAML
            const updatedYaml = yaml.dump(config, {
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
            });
            
            fs.writeFileSync(filePath, updatedYaml);
            console.log(`✅ Updated ${fileName}`);
        } else {
            console.log(`⏭️  No database config found in ${fileName}`);
        }
        
    } catch (error) {
        console.error(`❌ Error updating ${fileName}:`, error.message);
    }
}

// Update all function files
console.log('Updating Lambda function database configurations...\n');

functionFiles.forEach(file => {
    updateFunctionFile(file);
});

console.log('\n✨ Update complete!');
console.log('\nNote: This script updates the database environment variables to support conditional RDS Proxy usage.');
console.log('RDS Proxy will only be created and used in production stage.');