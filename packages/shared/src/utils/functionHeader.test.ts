import { beforeEach, describe, expect, it } from 'vitest';
import {
    FunctionRegistry, 
    hashExpression,
    parseFunctionHeader,
    prepareFunctionHeader,
    truncateExpression,
    validateFunctionHeader
} from './functionHeader.js';

describe('functionHeader utilities', () => {
    describe('hashExpression', () => {
        it('should generate consistent hash for same expression', async () => {
            const expr = 'sin(grid[0][0]) + cos(grid[1][1])';
            const hash1 = await hashExpression(expr);
            const hash2 = await hashExpression(expr);
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA256 produces 64 char hex
        });
        
        it('should generate different hashes for different expressions', async () => {
            const expr1 = 'sin(grid[0][0])';
            const expr2 = 'cos(grid[0][0])';
            const hash1 = await hashExpression(expr1);
            const hash2 = await hashExpression(expr2);
            expect(hash1).not.toBe(hash2);
        });
    });
    
    describe('truncateExpression', () => {
        it('should not truncate short expressions', () => {
            const expr = 'sin(x)';
            expect(truncateExpression(expr, 100)).toBe(expr);
        });
        
        it('should truncate long expressions intelligently', () => {
            const expr = 'sin(grid[0][0]) + cos(grid[1][1]) + tan(grid[2][2]) + log(grid[3][3])';
            const truncated = truncateExpression(expr, 30);
            expect(truncated).toContain('...');
            expect(truncated.length).toBeLessThanOrEqual(30);
        });
        
        it('should prefer truncating at function boundaries', () => {
            const expr = 'func1(a, b), func2(c, d), func3(e, f)';
            const truncated = truncateExpression(expr, 25);
            // Should truncate at comma or parenthesis
            expect(truncated).toMatch(/[\),]\.\.\.$/);
        });
    });
    
    describe('prepareFunctionHeader', () => {
        it('should include full expression for short functions', async () => {
            const expr = 'sin(grid[0][0])';
            const result = await prepareFunctionHeader(expr);
            
            expect(result.isValid).toBe(true);
            // By default, compact format is used, so expect compact version
            expect(result.headerValue).toContain(`expr:sin(g0.0)`);
            expect(result.headerValue).toContain(`hash:${result.hash}`);
            expect(result.headerValue).toContain(`len:${expr.length}`);
            expect(result.headerValue).toContain(`compact:full`);
            expect(result.truncated).toBeUndefined();
        });
        
        it('should include full expression in verbose format when compact is disabled', async () => {
            const expr = 'sin(grid[0][0])';
            const result = await prepareFunctionHeader(expr, { useCompactGrid: false });
            
            expect(result.isValid).toBe(true);
            expect(result.headerValue).toContain(`expr:${expr}`);
            expect(result.headerValue).toContain(`hash:${result.hash}`);
            expect(result.headerValue).toContain(`len:${expr.length}`);
            expect(result.headerValue).not.toContain(`compact:true`);
            expect(result.truncated).toBeUndefined();
        });
        
        it('should truncate very long expressions', async () => {
            const expr = 'x'.repeat(10000); // Very long expression
            const result = await prepareFunctionHeader(expr);
            
            expect(result.isValid).toBe(true);
            expect(result.truncated).toBeDefined();
            expect(result.truncated!.length).toBeLessThanOrEqual(103); // 100 + "..."
            expect(result.headerValue).toContain('truncated:true');
        });
        
        it('should respect custom configuration', async () => {
            const expr = 'sin(grid[0][0]) + cos(grid[1][1])';
            const result = await prepareFunctionHeader(expr, {
                includeTruncated: false,
                maxHeaderLength: 100
            });
            
            // With small header limit and no truncation, should only have hash
            expect(result.headerValue).toContain('hash:');
            expect(result.headerValue).not.toContain('expr:');
        });
        
        it('should handle extremely long expressions from the example', async () => {
            const longExpr = `timeseries.changePointDetection([hypot(linalg.qrDecomposition(grid), floor(grid[0][3])), timeseries.differencing([grid[2][3], cosh(grid[3][3]), grid[2][3], timeseries.holtWinters([grid[2][1], grid[4][0], grid[1][2], grid[4][1], grid[3][2], grid[2][0], grid[0][1], grid[0][3], grid[3][3], grid[4][2], grid[3][1], grid[1][3], grid[4][2], grid[3][3], grid[0][0]]), tanh(grid[1][0]), asec(grid[0][1]), linalg.qrDecomposition(grid), grid[3][0], cos(grid[4][1])], 2), stats.mean([grid[2][3], grid[1][2], grid[3][2], tsStats.median([grid[0][1], grid[1][0], grid[0][2]]), grid[1][0], grid[4][3]]), matrix.sumRow(grid, 2), grid[2][1], atan(signal.lowPassFilter([grid[4][2], grid[3][0], grid[0][0], grid[4][1], grid[2][0], grid[2][3], grid[3][0], grid[4][1], grid[1][0], grid[2][2], grid[2][0], grid[1][1], grid[4][1]], 0.45)), grid[2][4], grid[3][2], timeseries.autocorrelation([grid[4][4], round(grid[3][2]), grid[1][1], grid[2][0], grid[2][4], grid[1][0], grid[2][1], floor(grid[1][3])], 4), signal.powerSpectrum([grid[2][0], grid[0][2], grid[4][0], grid[4][1], grid[1][0], timeseries.changePointDetection([grid[0][4], grid[4][4], grid[4][4], grid[1][4], grid[2][4], grid[4][3], grid[4][4], grid[0][4], grid[4][4], grid[1][2], grid[3][0], grid[1][0], grid[4][4], grid[1][1], grid[2][0]], 5), stats.covariance([grid[3][0], grid[0][1], grid[2][1], grid[4][2], grid[3][3], grid[2][2], grid[1][2]], [grid[2][2], grid[1][0], grid[0][4], grid[0][3], grid[0][3], grid[4][2], grid[1][4]]), grid[3][3], timeseries.movingAverage([grid[3][2], grid[1][0], grid[3][2], grid[1][2], grid[3][0], grid[1][1], grid[4][4], grid[3][2], grid[3][0], grid[0][0], grid[2][1], grid[0][2], grid[0][2]], 7), grid[4][0], grid[3][1], grid[2][2], grid[4][0], grid[0][3], grid[2][4]]), grid[2][3], grid[2][0], grid[1][1], grid[2][1], signal.bandPassFilter([grid[1][2], grid[2][2], grid[3][3], grid[1][3], grid[4][2], grid[0][4], atan(grid[1][3])], 0.25, 0.44)], 5)`;
            
            const result = await prepareFunctionHeader(longExpr);
            
            expect(result.isValid).toBe(true);
            expect(result.hash).toHaveLength(64);
            expect(result.length).toBe(longExpr.length);
            // Since the expression is long (1926 chars) but compacts well, 
            // it should NOT be truncated by default (fits in 8KB header limit)
            expect(result.truncated).toBeUndefined();
            expect(result.headerValue.length).toBeLessThan(8192); // Should fit in header
        });
        
        it('should truncate when header size limit is exceeded', async () => {
            const longExpr = `timeseries.changePointDetection([hypot(linalg.qrDecomposition(grid), floor(grid[0][3])), timeseries.differencing([grid[2][3], cosh(grid[3][3]), grid[2][3]], 2)])`;
            
            // Force truncation by setting a limit between the non-truncated and truncated sizes
            const result = await prepareFunctionHeader(longExpr, {
                maxHeaderLength: 160, // Between 151 (truncated) and 167 (full)
                truncateAt: 30  // Smaller truncation to ensure it fits
            });
            
            // With this limit, it should truncate but still be valid
            expect(result.isValid).toBe(true);
            expect(result.truncated).toBeDefined();
            expect(result.truncated!.length).toBeLessThanOrEqual(33); // 30 + "..."
            expect(result.headerValue).toContain('truncated:true');
            expect(result.headerValue.length).toBeLessThanOrEqual(160);
        });
        
        it('should respect includeHash configuration', async () => {
            const expr = 'sin(grid[0][0])';
            
            // Test with hash disabled
            const resultNoHash = await prepareFunctionHeader(expr, { includeHash: false });
            
            expect(resultNoHash.isValid).toBe(true);
            expect(resultNoHash.headerValue).not.toContain('hash:');
            expect(resultNoHash.headerValue).toContain(`len:${expr.length}`);
            expect(resultNoHash.headerValue).toContain(`expr:`);
            expect(resultNoHash.hash).toBe(''); // Empty hash when disabled
            
            // Test with hash enabled (default)
            const resultWithHash = await prepareFunctionHeader(expr);
            
            expect(resultWithHash.isValid).toBe(true);
            expect(resultWithHash.headerValue).toContain('hash:');
            expect(resultWithHash.hash).toHaveLength(64);
        });
        
        it('should demonstrate significant space savings with compact grid format', async () => {
            const exprWithManyGridRefs = 'add(grid[4][0], multiply(grid[1][2], grid[3][3], grid[2][1], grid[0][4], grid[5][2]))';
            
            const verboseResult = await prepareFunctionHeader(exprWithManyGridRefs, { useCompactGrid: false, useCompactFunctions: false });
            const compactResult = await prepareFunctionHeader(exprWithManyGridRefs, { useCompactGrid: true, useCompactFunctions: false });
            
            console.log('\n🎯 Space Savings Demo:');
            console.log(`Verbose header length: ${verboseResult.headerValue.length}`);
            console.log(`Compact header length: ${compactResult.headerValue.length}`);
            console.log(`Saved: ${verboseResult.headerValue.length - compactResult.headerValue.length} bytes`);
            
            expect(compactResult.headerValue.length).toBeLessThan(verboseResult.headerValue.length);
            expect(compactResult.headerValue).toContain('compact:grid');
            expect(verboseResult.headerValue).not.toContain('compact:');
        });
    });
    
    describe('parseFunctionHeader', () => {
        it('should parse header components correctly', () => {
            const headerValue = 'hash:abc123;len:50;expr:sin(x);truncated:false';
            const parsed = parseFunctionHeader(headerValue);
            
            expect(parsed.hash).toBe('abc123');
            expect(parsed.length).toBe(50);
            expect(parsed.expression).toBe('sin(x)');
            expect(parsed.isTruncated).toBe(false);
        });
        
        it('should handle expressions with colons', () => {
            const headerValue = 'hash:abc;expr:func(a:b:c)';
            const parsed = parseFunctionHeader(headerValue);
            
            expect(parsed.expression).toBe('func(a:b:c)');
        });
    });
    
    describe('validateFunctionHeader', () => {
        it('should validate matching expressions', async () => {
            const expr = 'sin(grid[0][0])';
            const header = await prepareFunctionHeader(expr);
            const validation = await validateFunctionHeader(expr, header.headerValue);
            
            expect(validation.isValid).toBe(true);
        });
        
        it('should reject mismatched expressions', async () => {
            const expr = 'sin(grid[0][0])';
            const header = await prepareFunctionHeader(expr);
            const validation = await validateFunctionHeader('cos(grid[0][0])', header.headerValue);
            
            expect(validation.isValid).toBe(false);
            expect(validation.reason).toBe('Hash mismatch');
        });
        
        it('should detect missing hash', async () => {
            const validation = await validateFunctionHeader('sin(x)', 'len:5;expr:sin(x)');
            
            expect(validation.isValid).toBe(false);
            expect(validation.reason).toBe('No hash in header');
        });
    });
    
    describe('FunctionRegistry', () => {
        let registry: FunctionRegistry;
        
        beforeEach(() => {
            registry = new FunctionRegistry();
        });
        
        it('should store and retrieve expressions by hash', async () => {
            const expr = 'sin(grid[0][0]) + cos(grid[1][1])';
            const hash = await registry.store(expr);
            
            expect(registry.has(hash)).toBe(true);
            expect(registry.get(hash)).toBe(expr);
            expect(registry.size).toBe(1);
        });
        
        it('should handle multiple expressions', async () => {
            const expr1 = 'sin(x)';
            const expr2 = 'cos(x)';
            
            const hash1 = await registry.store(expr1);
            const hash2 = await registry.store(expr2);
            
            expect(hash1).not.toBe(hash2);
            expect(registry.size).toBe(2);
            expect(registry.get(hash1)).toBe(expr1);
            expect(registry.get(hash2)).toBe(expr2);
        });
        
        it('should clear all entries', async () => {
            await registry.store('expr1');
            await registry.store('expr2');
            expect(registry.size).toBe(2);
            
            registry.clear();
            expect(registry.size).toBe(0);
        });
        
        it('should not duplicate same expressions', async () => {
            const expr = 'sin(x)';
            const hash1 = await registry.store(expr);
            const hash2 = await registry.store(expr);
            
            expect(hash1).toBe(hash2);
            expect(registry.size).toBe(1);
        });
    });
});