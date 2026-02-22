export const TOKEN_ISSUER = Symbol('TokenIssuer');

export interface TokenPayload {
  userId: string;
  email: string;
  grade: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenIssuer {
  issueTokens(payload: TokenPayload): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}
