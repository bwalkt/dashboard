/**
 * Example integration showing how to use function headers in HTTP requests
 */

import { genFunction } from '../grid/grid.js';
import { 
    FunctionRegistry,
    parseFunctionHeader, 
    prepareFunctionHeader, 
    validateFunctionHeader 
} from './functionHeader.js';
import { toFullVerbose, toVerboseFunctions } from './functionShorthand.js';
import { toVerboseGrid } from './gridShorthand.js';

// Server-side registry for storing full expressions
const serverRegistry = new FunctionRegistry();

/**
 * Example: Client-side function to send genFunction in HTTP header
 */
export function sendFunctionRequest(expression: string): {
    headers: Record<string, string>;
    body?: any;
} {
    // Prepare the function for header transmission
    const headerResult = prepareFunctionHeader(expression, {
        maxHeaderLength: 4096,  // Conservative limit for headers
        includeTruncated: true,
        truncateAt: 100
    });
    
    if (!headerResult.isValid) {
        throw new Error('Function expression too large for headers');
    }
    
    // Build request
    const headers: Record<string, string> = {
        'X-Function-Expression': headerResult.headerValue,
        'Content-Type': 'application/json'
    };
    
    // If expression was truncated, optionally send full expression in body
    const body = headerResult.truncated ? {
        fullExpression: expression
    } : undefined;
    
    console.log('📤 Sending function request:');
    console.log(`  Hash: ${headerResult.hash}`);
    console.log(`  Original length: ${headerResult.length}`);
    console.log(`  Header size: ${headerResult.headerValue.length}`);
    console.log(`  Truncated: ${!!headerResult.truncated}`);
    
    return { headers, body };
}

/**
 * Example: Server-side function to receive and validate genFunction
 */
export function receiveFunctionRequest(
    headers: Record<string, string>,
    body?: any
): {
    expression: string;
    isValid: boolean;
    hash: string;
} {
    const functionHeader = headers['X-Function-Expression'] || headers['x-function-expression'];
    
    if (!functionHeader) {
        throw new Error('Missing X-Function-Expression header');
    }
    
    // Parse the header
    const parsed = parseFunctionHeader(functionHeader);
    
    if (!parsed.hash) {
        throw new Error('Invalid function header: missing hash');
    }
    
    // Try to get full expression from various sources
    let fullExpression: string | undefined;
    
    // 1. Check if we have it in our registry
    if (serverRegistry.has(parsed.hash)) {
        fullExpression = serverRegistry.get(parsed.hash);
        console.log('✅ Found expression in server registry');
    }
    // 2. Check if it's in the header (not truncated)
    else if (parsed.expression && !parsed.isTruncated) {
        fullExpression = parsed.expression;
        
        // Convert from compact format if needed
        if (parsed.compactType) {
            if (parsed.compactType === 'full') {
                fullExpression = toFullVerbose(fullExpression);
                console.log('✅ Using complete expression from header (converted from full compact)');
            } else if (parsed.compactType === 'grid') {
                fullExpression = toVerboseGrid(fullExpression);
                console.log('✅ Using complete expression from header (converted from grid compact)');
            } else if (parsed.compactType === 'functions') {
                fullExpression = toVerboseFunctions(fullExpression);
                console.log('✅ Using complete expression from header (converted from function compact)');
            }
        } else {
            console.log('✅ Using complete expression from header');
        }
        
        // Store for future use
        serverRegistry.store(fullExpression);
    }
    // 3. Check if full expression is in body
    else if (body?.fullExpression && typeof body.fullExpression === 'string') {
        const bodyExpression = body.fullExpression as string;
        // Validate it matches the hash
        const validation = validateFunctionHeader(bodyExpression, functionHeader);
        if (!validation.isValid) {
            throw new Error(`Expression validation failed: ${validation.reason}`);
        }
        fullExpression = bodyExpression;
        // Store for future use
        serverRegistry.store(bodyExpression);
        console.log('✅ Using full expression from request body');
    }
    // 4. Only have truncated version
    else if (parsed.expression && parsed.isTruncated) {
        console.log('⚠️  Only truncated expression available');
        return {
            expression: parsed.expression,
            isValid: false, // Can't fully validate truncated
            hash: parsed.hash
        };
    } else {
        throw new Error('No expression found in request');
    }
    
    if (!fullExpression) {
        throw new Error('Failed to retrieve full expression');
    }
    
    // Final validation
    const validation = validateFunctionHeader(fullExpression, functionHeader);
    
    console.log('📥 Received function:');
    console.log(`  Hash: ${parsed.hash}`);
    console.log(`  Original length: ${parsed.length || 'unknown'}`);
    console.log(`  Valid: ${validation.isValid}`);
    
    return {
        expression: fullExpression,
        isValid: validation.isValid,
        hash: parsed.hash
    };
}

/**
 * Example usage demonstrating the full flow
 */
export function demonstrateUsage() {
    console.log('🚀 Function Header Demo\n');
    console.log('=' .repeat(50));
    
    // Generate a complex function
    const func = genFunction(4, 5);
    console.log('\n📝 Generated Function:');
    console.log(`  ID: ${func.id}`);
    console.log(`  Length: ${func.expression.length} characters`);
    console.log(`  Complexity: Level ${func.complexity.level}`);
    
    console.log('\n' + '=' .repeat(50));
    
    // Simulate client sending the request
    console.log('\n🌐 CLIENT SIDE:');
    const request = sendFunctionRequest(func.expression);
    
    console.log('\n' + '=' .repeat(50));
    
    // Simulate server receiving the request
    console.log('\n🖥️  SERVER SIDE:');
    const received = receiveFunctionRequest(request.headers, request.body);
    
    console.log('\n' + '=' .repeat(50));
    
    // Verify the result
    console.log('\n✨ Verification:');
    console.log(`  Expressions match: ${received.expression === func.expression}`);
    console.log(`  Validation passed: ${received.isValid}`);
    console.log(`  Hash verified: ${received.hash === prepareFunctionHeader(func.expression).hash}`);
    
    // Show registry stats
    console.log(`\n📊 Server Registry Stats:`);
    console.log(`  Stored expressions: ${serverRegistry.size}`);
    
    console.log('\n' + '=' .repeat(50));
    
    // Demonstrate with a very long expression
    console.log('\n🔬 Testing with very long expression:');
    const longExpr = 'sin(' + 'grid[0][0] + '.repeat(1000) + 'grid[0][0])';
    console.log(`  Expression length: ${longExpr.length} characters`);
    
    const longRequest = sendFunctionRequest(longExpr);
    console.log(`  Sent in body: ${!!longRequest.body}`);
    
    const longReceived = receiveFunctionRequest(longRequest.headers, longRequest.body);
    console.log(`  Successfully received: ${longReceived.isValid}`);
    
    return {
        originalExpression: func.expression,
        receivedExpression: received.expression,
        isValid: received.isValid
    };
}

// If running directly, demonstrate the usage
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateUsage();
}