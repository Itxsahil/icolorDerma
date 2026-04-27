import { usersTable } from '@/db/schemas/users';
import { InferSelectModel } from 'drizzle-orm';

type User = InferSelectModel<typeof usersTable>;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
