import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      avatarUrl?: string | null;
    }
    interface Request {
      user?: User;
    }
  }
}
