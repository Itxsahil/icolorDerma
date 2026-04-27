import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@/utils/ApiError';
import db from '@/db';
import { usersTable } from '@/db/schemas/users';
import { eq } from 'drizzle-orm';

const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies?.access_token;

    if (!token) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid token');
    }

    const secret = process.env.ACCESS_TOKEN_SECRET || 'access_secret';

    const decoded = jwt.verify(token, secret);

    if (!decoded || typeof decoded !== 'object') {
      throw new ApiError(401, 'Unauthorized: Invalid token payload');
    }

    const userId = (decoded as any).id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized: User ID not found in token');
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) {
      throw new ApiError(401, 'Unauthorized: User not found');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export default validateUser;
