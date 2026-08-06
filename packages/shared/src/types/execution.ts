import { ProgrammingLanguage } from './workspace.js';

export interface ExecutionRequestDto {
  workspaceId: string;
  fileId: string;
  language: ProgrammingLanguage;
  code: string;
}

export interface ExecutionResultDto {
  executionId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
