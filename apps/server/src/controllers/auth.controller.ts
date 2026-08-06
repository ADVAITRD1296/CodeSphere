import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// Cookie options factory – sameSite must be 'none' when the client and server
// are on different origins (e.g. different IPs in dev). 'none' requires
// secure:true in production (HTTPS). In HTTP dev we use 'lax' as a fallback
// because browsers reject 'none' without Secure in strict mode.
function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }

      const result = await AuthService.register({ email, username, password });

      // Set HTTP-only refresh cookie
      res.cookie('refreshToken', result.refreshToken, cookieOptions());

      return res.status(201).json({
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.login({ email, password });

      res.cookie('refreshToken', result.refreshToken, cookieOptions());

      return res.json({
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (err: any) {
      return res.status(401).json({ error: err.message || 'Login failed' });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        return res.status(401).json({ error: 'Missing refresh token cookie' });
      }

      const result = await AuthService.refresh(token);

      res.cookie('refreshToken', result.refreshToken, cookieOptions());

      return res.json({
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (err: any) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: err.message || 'Token refresh failed' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = req.cookies.refreshToken;
      if (token) {
        await AuthService.logout(token);
      }
      res.clearCookie('refreshToken');
      return res.json({ message: 'Successfully logged out' });
    } catch (err: any) {
      res.clearCookie('refreshToken');
      return res.json({ message: 'Logged out' });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const user = await AuthService.getUserProfile(req.user.userId);
      return res.json({ user });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'User profile not found' });
    }
  }
}
