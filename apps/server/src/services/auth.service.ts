import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { RegisterRequestDto, LoginRequestDto, UserDto } from '@codesphere/shared';

const SALT_ROUNDS = 10;

export class AuthService {
  static async register(dto: RegisterRequestDto) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          { username: dto.username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash
      }
    });

    const jwtPayload = { userId: user.id, email: user.email, username: user.username };
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Save refresh token to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      user: this.mapToUserDto(user),
      accessToken,
      refreshToken
    };
  }

  static async login(dto: LoginRequestDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const jwtPayload = { userId: user.id, email: user.email, username: user.username };
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      user: this.mapToUserDto(user),
      accessToken,
      refreshToken
    };
  }

  static async refresh(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token }
    });

    // Reuse detection: If token isn't found in DB, token theft might have occurred -> revoke all tokens for user!
    if (!storedToken) {
      await prisma.refreshToken.deleteMany({
        where: { userId: payload.userId }
      });
      throw new Error('Refresh token reuse detected. All sessions revoked for security.');
    }

    // Delete old token (Rotation)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      throw new Error('User no longer exists');
    }

    // Issue new pair
    const jwtPayload = { userId: user.id, email: user.email, username: user.username };
    const newAccessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = generateRefreshToken(jwtPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.mapToUserDto(user)
    };
  }

  static async logout(token: string) {
    if (!token) return;
    await prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  static async getUserProfile(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.mapToUserDto(user);
  }

  private static mapToUserDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }
}
