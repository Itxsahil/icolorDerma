import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

interface TokenPayload {
  id: string | number;
  email: string;
  role?: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export function generateTokens({ id, email, role }: TokenPayload): TokenPair {
  const payload: TokenPayload = { id, email, role };

  const access_token = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });

  const refresh_token = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });

  return { access_token, refresh_token };
}
