import { describe, it, expect } from 'vitest';
import {
    toCompactFunctions,
    toVerboseFunctions,
    toFullCompact,
    toFullVerbose,
    analyzeFunctionCompaction,
    analyzeFullCompaction,
    hasCompactFunctions,
    getFunctionShortcuts
} from './functionShorthand.js';

describe('functionShorthand utilities', () => {
    describe('toCompactFunctions', () => {
        it('should convert statistical function names', () => {
            expect(toCompactFunctions('stats.harmonicMean(x, y)')).toBe('s.hm(x, y)');
            expect(toCompactFunctions('stats.correlation(a, b)')).toBe('s.cor(a, b)');
            expect(toCompactFunctions('stats.standardDeviation(data)')).toBe('s.sd(data)');
        });
        
        it('should convert time series function names', () => {
            expect(toCompactFunctions('timeseries.movingAverage(data, 5)')).toBe('ts.ma(data, 5)');
            expect(toCompactFunctions('timeseries.exponentialSmoothing(data, 0.5)')).toBe('ts.es(data, 0.5)');
            expect(toCompactFunctions('timeseries.changePointDetection(data, 3)')).toBe('ts.cpd(data, 3)');
        });
        
        it('should convert signal processing function names', () => {
            expect(toCompactFunctions('signal.bandPassFilter(data, 0.1, 0.4)')).toBe('sig.bp(data, 0.1, 0.4)');
            expect(toCompactFunctions('signal.powerSpectrum(data)')).toBe('sig.ps(data)');
            expect(toCompactFunctions('signal.crossCorrelation(a, b)')).toBe('sig.cc(a, b)');
        });
        
        it('should convert bitwise operations', () => {
            expect(toCompactFunctions('bitXor(a, b)')).toBe('bX(a, b)');
            expect(toCompactFunctions('leftShift(x, 2)')).toBe('lS(x, 2)');
            expect(toCompactFunctions('rightShift(y, 3)')).toBe('rS(y, 3)');
        });
        
        it('should convert matrix operations', () => {
            expect(toCompactFunctions('matrix.stdDevCol(grid, 2)')).toBe('m.sdc(grid, 2)');
            expect(toCompactFunctions('matrix.sumRow(grid, 1)')).toBe('m.sr(grid, 1)');
        });
        
        it('should convert multiple functions in one expression', () => {
            const expr = 'stats.correlation([stats.mean(data)], [timeseries.movingAverage(series, 3)])';
            const expected = 's.cor([s.m(data)], [ts.ma(series, 3)])';
            expect(toCompactFunctions(expr)).toBe(expected);
        });
        
        it('should handle expressions without known functions', () => {
            const expr = 'add(sin(x), cos(y))';
            expect(toCompactFunctions(expr)).toBe(expr);
        });
    });
    
    describe('toVerboseFunctions', () => {
        it('should convert compact function names back to verbose', () => {
            expect(toVerboseFunctions('s.hm(x, y)')).toBe('stats.harmonicMean(x, y)');
            expect(toVerboseFunctions('ts.ma(data, 5)')).toBe('timeseries.movingAverage(data, 5)');
            expect(toVerboseFunctions('sig.bp(data, 0.1, 0.4)')).toBe('signal.bandPassFilter(data, 0.1, 0.4)');
            expect(toVerboseFunctions('bX(a, b)')).toBe('bitXor(a, b)');
        });
        
        it('should be reversible', () => {
            const original = 'stats.harmonicMean(timeseries.movingAverage(data, 3), signal.fft(series))';
            const compact = toCompactFunctions(original);
            const restored = toVerboseFunctions(compact);
            expect(restored).toBe(original);
        });
    });
    
    describe('toFullCompact and toFullVerbose', () => {
        it('should apply both grid and function compaction', () => {
            const expr = 'stats.harmonicMean(grid[4][0], grid[1][2])';
            const compact = toFullCompact(expr);
            expect(compact).toBe('s.hm(g4.0, g1.2)');
        });
        
        it('should be fully reversible', () => {
            const original = 'timeseries.movingAverage([grid[0][0], grid[1][1], grid[2][2]], 3)';
            const compact = toFullCompact(original);
            const restored = toFullVerbose(compact);
            expect(restored).toBe(original);
        });
        
        it('should handle complex nested expressions', () => {
            const expr = 'signal.bandPassFilter([stats.mean([grid[0][0], grid[1][1]]), matrix.sumRow(grid, 2)], 0.1, 0.4)';
            const compact = toFullCompact(expr);
            const restored = toFullVerbose(compact);
            expect(restored).toBe(expr);
        });
    });
    
    describe('analyzeFunctionCompaction', () => {
        it('should calculate function name savings correctly', () => {
            const expr = 'stats.harmonicMean(x, y)';
            const stats = analyzeFunctionCompaction(expr);
            
            expect(stats.originalLength).toBe(expr.length);
            expect(stats.compactLength).toBeLessThan(expr.length);
            expect(stats.savedBytes).toBeGreaterThan(0);
            expect(stats.savedPercentage).toBeGreaterThan(0);
            expect(stats.functionReplacements).toBe(1);
        });
        
        it('should handle expressions with multiple function calls', () => {
            const expr = 'stats.correlation([stats.mean(data)], [timeseries.movingAverage(series, 3)])';
            const stats = analyzeFunctionCompaction(expr);
            
            expect(stats.functionReplacements).toBe(3); // correlation, mean, movingAverage
            expect(stats.savedBytes).toBeGreaterThan(15); // Should save significant space
        });
    });
    
    describe('analyzeFullCompaction', () => {
        it('should show breakdown of grid vs function savings', () => {
            const expr = 'stats.harmonicMean(grid[4][0], grid[1][2])';
            const stats = analyzeFullCompaction(expr);
            
            expect(stats.original).toBe(expr.length);
            expect(stats.fullCompact).toBeLessThan(stats.original);
            expect(stats.totalSaved).toBeGreaterThan(0);
            expect(stats.totalPercentage).toBeGreaterThan(0);
            
            // Both grid and function compaction should contribute
            expect(stats.gridOnly).toBeLessThan(stats.original);
            expect(stats.functionsOnly).toBeLessThan(stats.original);
        });
    });
    
    describe('hasCompactFunctions', () => {
        it('should detect compact function names', () => {
            expect(hasCompactFunctions('s.hm(x, y)')).toBe(true);
            expect(hasCompactFunctions('ts.ma(data, 5)')).toBe(true);
            expect(hasCompactFunctions('bX(a, b)')).toBe(true);
            expect(hasCompactFunctions('add(sin(x), cos(y))')).toBe(false);
        });
    });
    
    describe('getFunctionShortcuts', () => {
        it('should return all available shortcuts', () => {
            const shortcuts = getFunctionShortcuts();
            
            expect(shortcuts['stats.harmonicMean']).toBe('s.hm');
            expect(shortcuts['timeseries.movingAverage']).toBe('ts.ma');
            expect(shortcuts['signal.bandPassFilter']).toBe('sig.bp');
            expect(shortcuts['bitXor']).toBe('bX');
            expect(Object.keys(shortcuts).length).toBeGreaterThan(50);
        });
    });
    
    describe('real-world space savings', () => {
        it('should significantly reduce complex expressions', () => {
            const complexExpr = `timeseries.changePointDetection([stats.harmonicMean([grid[0][0], grid[1][1]]), signal.bandPassFilter([grid[2][2], grid[3][3], grid[4][4]], 0.1, 0.4), matrix.stdDevCol(grid, 2), linalg.determinant(grid)], 5)`;
            
            const compact = toFullCompact(complexExpr);
            const stats = analyzeFullCompaction(complexExpr);
            
            console.log('\n🎯 Real-world Complex Example:');
            console.log(`Original: ${complexExpr}`);
            console.log(`Compact: ${compact}`);
            console.log(`Total savings: ${stats.totalSaved} bytes (${stats.totalPercentage.toFixed(1)}%)`);
            
            expect(compact.length).toBeLessThan(complexExpr.length);
            expect(stats.totalPercentage).toBeGreaterThan(40); // Should save at least 40%
            
            // Verify it's reversible
            const restored = toFullVerbose(compact);
            expect(restored).toBe(complexExpr);
        });
        
        it('should handle the long expression from your example', () => {
            const longExpr = `timeseries.simpleLinearForecast([grid[0][0], grid[4][1], grid[3][1], grid[2][3], grid[3][3], signal.highPassFilter([grid[0][1], grid[1][2], grid[0][1], timeseries.trendAnalysis([grid[2][0], grid[3][1], grid[1][1], grid[4][4], grid[2][2], grid[0][0], grid[4][2], grid[3][3], grid[0][4], grid[0][1], grid[3][3], grid[4][2], grid[3][3], grid[1][1]]), grid[1][2], grid[3][0], grid[4][2], grid[1][3], tanh(grid[2][0]), grid[1][0], grid[1][4], signal.spectrogram([grid[0][1], grid[1][1], grid[0][0], grid[0][3], grid[2][4], grid[4][3], grid[0][2], grid[1][4], grid[4][3], grid[0][4], grid[0][2], grid[1][0], grid[4][1], grid[0][0], grid[4][2]], 8)], 0.23), grid[3][2], grid[0][2]], 2)`;
            
            const compact = toFullCompact(longExpr);
            const stats = analyzeFullCompaction(longExpr);
            
            console.log('\n🚀 Your Long Expression Example:');
            console.log(`Original length: ${longExpr.length}`);
            console.log(`Compact length: ${compact.length}`);
            console.log(`Total savings: ${stats.totalSaved} bytes (${stats.totalPercentage.toFixed(1)}%)`);
            
            expect(compact.length).toBeLessThan(longExpr.length);
            expect(stats.totalPercentage).toBeGreaterThan(30); // Should save at least 30%
            
            // Verify it's reversible
            const restored = toFullVerbose(compact);
            expect(restored).toBe(longExpr);
        });
    });
});