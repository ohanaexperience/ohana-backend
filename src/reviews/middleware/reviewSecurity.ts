import { APIGatewayProxyEvent } from "aws-lambda";

// Rate limiting configuration
const RATE_LIMITS = {
    CREATE_REVIEW: {
        maxRequests: 5,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    FLAG_REVIEW: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
    },
    HELPFUL_VOTE: {
        maxRequests: 50,
        windowMs: 60 * 60 * 1000, // 1 hour
    },
};

// In-memory store for rate limiting (in production, use Redis or DynamoDB)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimitKey(userId: string, action: string): string {
    return `${userId}:${action}`;
}

export function isRateLimited(userId: string, action: keyof typeof RATE_LIMITS): boolean {
    const config = RATE_LIMITS[action];
    const key = createRateLimitKey(userId, action);
    const now = Date.now();
    
    const userRate = rateLimitStore.get(key);
    
    if (!userRate || now > userRate.resetTime) {
        // Reset or create new rate limit entry
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return false;
    }
    
    if (userRate.count >= config.maxRequests) {
        return true;
    }
    
    userRate.count += 1;
    return false;
}

// Content validation for reviews
export function validateReviewContent(content: string): { isValid: boolean; reason?: string } {
    // Check for spam patterns
    const spamPatterns = [
        /(.)\1{10,}/, // Repeated characters
        /https?:\/\/[^\s]+/gi, // URLs
        /\b(?:buy|sell|cheap|discount|offer|deal)\b/gi, // Commercial keywords
        /\b(?:contact|email|phone|call)\b/gi, // Contact info patterns
    ];
    
    for (const pattern of spamPatterns) {
        if (pattern.test(content)) {
            return { isValid: false, reason: "Content contains spam-like patterns" };
        }
    }
    
    // Check for excessive capitalization
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.5 && content.length > 20) {
        return { isValid: false, reason: "Excessive use of capital letters" };
    }
    
    // Check for profanity (basic check - in production use a proper profanity filter)
    const profanityPatterns = [
        /\b(?:damn|hell|stupid|idiot|hate|worst|terrible|awful|horrible|disgusting)\b/gi,
    ];
    
    let profanityCount = 0;
    for (const pattern of profanityPatterns) {
        const matches = content.match(pattern);
        if (matches) {
            profanityCount += matches.length;
        }
    }
    
    if (profanityCount > 2) {
        return { isValid: false, reason: "Content contains excessive negative language" };
    }
    
    return { isValid: true };
}

// IP-based abuse detection
const ipActivityStore = new Map<string, { requests: number[]; lastRequest: number }>();

export function detectAbuseByIP(event: APIGatewayProxyEvent): boolean {
    const clientIP = event.requestContext.identity?.sourceIp || 'unknown';
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxRequestsPerWindow = 20;
    
    const ipActivity = ipActivityStore.get(clientIP);
    
    if (!ipActivity) {
        ipActivityStore.set(clientIP, {
            requests: [now],
            lastRequest: now,
        });
        return false;
    }
    
    // Clean old requests outside the window
    ipActivity.requests = ipActivity.requests.filter(timestamp => now - timestamp < windowMs);
    ipActivity.requests.push(now);
    ipActivity.lastRequest = now;
    
    return ipActivity.requests.length > maxRequestsPerWindow;
}

// User agent validation
export function validateUserAgent(event: APIGatewayProxyEvent): boolean {
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    
    // Block obvious bots and scrapers
    const blockedPatterns = [
        /bot/i,
        /spider/i,
        /crawler/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /^$/,
    ];
    
    return !blockedPatterns.some(pattern => pattern.test(userAgent));
}

// Security headers for responses
export function getSecurityHeaders() {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    };
}

// Comprehensive security check middleware
export function performSecurityChecks(
    event: APIGatewayProxyEvent,
    userId: string,
    action: keyof typeof RATE_LIMITS,
    content?: string
): { passed: boolean; error?: string; statusCode?: number } {
    // Check rate limiting
    if (isRateLimited(userId, action)) {
        return {
            passed: false,
            error: "Rate limit exceeded. Please try again later.",
            statusCode: 429,
        };
    }
    
    // Check IP-based abuse
    if (detectAbuseByIP(event)) {
        return {
            passed: false,
            error: "Too many requests from this IP address.",
            statusCode: 429,
        };
    }
    
    // Validate user agent
    if (!validateUserAgent(event)) {
        return {
            passed: false,
            error: "Invalid request source.",
            statusCode: 403,
        };
    }
    
    // Validate content if provided
    if (content) {
        const contentValidation = validateReviewContent(content);
        if (!contentValidation.isValid) {
            return {
                passed: false,
                error: `Content validation failed: ${contentValidation.reason}`,
                statusCode: 400,
            };
        }
    }
    
    return { passed: true };
}