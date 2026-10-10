/**
 * Environment Configuration Validator
 * Validates mandatory server environment variables at startup and enforces security invariants.
 */

function validateEnv() {
    const isTest = process.env.NODE_ENV === 'test';
    const errors = [];

    // In test environment, tests often supply their own in-memory URI or JWT_SECRET
    if (!isTest) {
        if (!process.env.MONGO_URI) {
            errors.push('MONGO_URI is required.');
        }
    }

    if (!process.env.JWT_SECRET) {
        if (!isTest) {
            errors.push('JWT_SECRET is required.');
        }
    } else if (process.env.JWT_SECRET.length < 16) {
        errors.push('JWT_SECRET must be at least 16 characters long for cryptographic safety.');
    }

    if (errors.length > 0) {
        console.error('❌ Environment Configuration Error(s):');
        errors.forEach(err => console.error(`  - ${err}`));
        console.error('Please configure the required environment variables in your .env file or environment.');
        if (!isTest) {
            process.exit(1);
        }
    }

    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT, 10) || 3000,
        MONGO_URI: process.env.MONGO_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['http://localhost:5173', 'http://localhost:3000'],
    };
}

module.exports = {
    validateEnv
};
