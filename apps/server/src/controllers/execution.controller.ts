import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ExecutionService } from '../services/execution.service.js';

export class ExecutionController {
  static async executeCode(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { language, code } = req.body;

      if (!language || code === undefined) {
        return res.status(400).json({ error: 'Language and code are required' });
      }

      const result = await ExecutionService.executeCode(userId, language, code);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Execution failed' });
    }
  }
}
