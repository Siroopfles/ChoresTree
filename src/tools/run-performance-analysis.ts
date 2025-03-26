#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

// Build both versions first
async function buildProject() {
    console.warn('Building project...');
    return new Promise((resolve, reject) => {
        const build = spawn('pnpm', ['build'], {
            stdio: 'inherit'
        });
        
        build.on('close', (code) => {
            if (code === 0) {
                resolve(undefined);
            } else {
                reject(new Error(`Build failed with code ${code}`));
            }
        });
    });
}

// Run performance analysis
async function runAnalysis() {
    try {
        // Build project first
        await buildProject();
        
        // Start services
        console.warn('Starting required services...');
        await new Promise((resolve) => {
            const docker = spawn('pnpm', ['docker:db:up'], {
                stdio: 'inherit'
            });
            
            docker.on('close', resolve);
        });

        // Run analysis
        console.warn('Running performance analysis...');
        const analysisScript = path.join(__dirname, 'performance-analysis.js');
        
        const analysis = spawn('node', [analysisScript], {
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });

        analysis.on('close', async (code) => {
            // Cleanup
            console.warn('Cleaning up...');
            const cleanup = spawn('pnpm', ['docker:db:down'], {
                stdio: 'inherit'
            });
            
            cleanup.on('close', () => {
                process.exit(code || 0);
            });
        });

    } catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}

runAnalysis();