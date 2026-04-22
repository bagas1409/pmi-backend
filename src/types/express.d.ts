// src/types/express.d.ts
// Memperluas tipe Request bawaan Express agar properti `user`
// yang kita inject dari JWT dikenali oleh TypeScript secara global.

import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}
