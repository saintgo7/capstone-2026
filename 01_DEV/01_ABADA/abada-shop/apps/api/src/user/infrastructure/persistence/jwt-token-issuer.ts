import { createHmac } from 'crypto';
import { TokenIssuer, TokenPayload, TokenPair } from '../../application/port/token-issuer.js';
import { UnauthorizedError } from '../../../shared/domain/index.js';

// Simple JWT-like token issuer for development
// Production: use proper JWT library (@fastify/jwt)
export class SimpleTokenIssuer implements TokenIssuer {
  constructor(
    private readonly secret: string,
    private readonly accessTokenExpiry = 3600,    // 1 hour
    private readonly refreshTokenExpiry = 2592000, // 30 days
  ) {}

  async issueTokens(payload: TokenPayload): Promise<TokenPair> {
    return {
      accessToken: this.createToken(payload, this.accessTokenExpiry),
      refreshToken: this.createToken(payload, this.refreshTokenExpiry),
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.verifyToken(token);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.verifyToken(token);
  }

  private createToken(payload: TokenPayload, expiresIn: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    })).toString('base64url');
    const signature = createHmac('sha256', this.secret)
      .update(`${header}.${claims}`)
      .digest('base64url');
    return `${header}.${claims}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedError('Invalid token format');

    const [header, claims, signature] = parts as [string, string, string];
    const expectedSig = createHmac('sha256', this.secret)
      .update(`${header}.${claims}`)
      .digest('base64url');

    if (signature !== expectedSig) throw new UnauthorizedError('Invalid token signature');

    const decoded = JSON.parse(Buffer.from(claims, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedError('Token expired');
    }

    return {
      userId: decoded['userId'] as string,
      email: decoded['email'] as string,
      grade: decoded['grade'] as string,
    };
  }
}
