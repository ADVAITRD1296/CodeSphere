import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { prisma } from '../lib/prisma.js';
import { ProgrammingLanguage, ExecutionResultDto } from '@codesphere/shared';

export class ExecutionService {
  static async executeCode(
    userId: string,
    language: ProgrammingLanguage,
    code: string
  ): Promise<ExecutionResultDto> {
    const executionId = Math.random().toString(36).substring(2, 9);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codesphere-exec-'));
    
    let fileName = 'main.js';
    let dockerImage = 'node:20-alpine';
    let runCmd = ['node', `/code/${fileName}`];

    switch (language) {
      case 'JAVASCRIPT':
        fileName = 'script.js';
        dockerImage = 'node:20-alpine';
        runCmd = ['node', `/code/${fileName}`];
        break;
      case 'TYPESCRIPT':
        fileName = 'script.ts';
        dockerImage = 'node:20-alpine';
        runCmd = ['npx', 'tsx', `/code/${fileName}`];
        break;
      case 'PYTHON':
        fileName = 'script.py';
        dockerImage = 'python:3.11-alpine';
        runCmd = ['python3', `/code/${fileName}`];
        break;
      case 'CPP':
        fileName = 'main.cpp';
        dockerImage = 'gcc:12';
        runCmd = ['sh', '-c', `g++ /code/${fileName} -o /tmp/app && /tmp/app`];
        break;
      case 'GO':
        fileName = 'main.go';
        dockerImage = 'golang:1.21-alpine';
        runCmd = ['go', 'run', `/code/${fileName}`];
        break;
    }

    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, code, 'utf-8');

    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      // Try Docker Sandbox Execution
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--cpus', '0.5',
        '--pids-limit', '64',
        '-v', `${tempDir}:/code:ro`,
        dockerImage,
        ...runCmd
      ];

      const process = spawn('docker', dockerArgs);

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        process.kill('SIGKILL');
      }, 5000); // 5 sec wall-clock timeout

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (err) => {
        // Fallback to direct process spawn if docker command fails locally
        this.fallbackDirectExecution(language, filePath, tempDir, startTime)
          .then(resolve);
      });

      process.on('close', async (exitCode) => {
        clearTimeout(timeoutId);
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

        const durationMs = Date.now() - startTime;

        if (isTimedOut) {
          stderr += '\n[Execution Error]: Time Limit Exceeded (5 seconds max)';
          exitCode = 124;
        }

        const result: ExecutionResultDto = {
          executionId,
          stdout,
          stderr,
          exitCode: exitCode || 0,
          durationMs
        };

        // Save execution log to DB
        try {
          await prisma.executionLog.create({
            data: {
              userId,
              language,
              code,
              stdout,
              stderr,
              exitCode: result.exitCode,
              durationMs
            }
          });
        } catch (dbErr) {
          console.error('Failed to log execution to DB:', dbErr);
        }

        resolve(result);
      });
    });
  }

  private static async fallbackDirectExecution(
    language: ProgrammingLanguage,
    filePath: string,
    tempDir: string,
    startTime: number
  ): Promise<ExecutionResultDto> {
    const executionId = Math.random().toString(36).substring(2, 9);
    let cmd = 'node';
    let args = [filePath];

    if (language === 'PYTHON') {
      cmd = 'python3';
      args = [filePath];
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const proc = spawn(cmd, args);

      const timer = setTimeout(() => {
        isTimedOut = true;
        proc.kill('SIGKILL');
      }, 5000);

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', async (exitCode) => {
        clearTimeout(timer);
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

        const durationMs = Date.now() - startTime;
        if (isTimedOut) {
          stderr += '\n[Execution Error]: Time Limit Exceeded (5 seconds max)';
          exitCode = 124;
        }

        resolve({
          executionId,
          stdout,
          stderr,
          exitCode: exitCode || 0,
          durationMs
        });
      });
    });
  }
}
