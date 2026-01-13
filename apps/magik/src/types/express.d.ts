import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      roles?: string[];
      // Add any other user properties your auth system uses
    }
    
    interface Request {
      user?: User;
    }
  }
}
