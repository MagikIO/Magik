import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import flash from 'connect-flash';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import passport from 'passport';

export interface SessionOptions {
  priority?: {
    session?: number;
    passportInitialize?: number;
    passportSession?: number;
    flash?: number;
  };
  session?: {
    enabled?: boolean;
    secret?: string | string[];
    name?: string;
    resave?: boolean;
    saveUninitialized?: boolean;
    cookie?: session.CookieOptions;
    rolling?: boolean;
    proxy?: boolean;
    unset?: 'destroy' | 'keep';
  };
  passport?: {
    enabled?: boolean;
    userProperty?: string;
  };
  flash?: {
    enabled?: boolean;
  };
}

const DEFAULT_SESSION_OPTIONS = {
  priority: {
    session: 80,
    passportInitialize: 75,
    passportSession: 74,
    flash: 73,
  },
  session: {
    enabled: true,
    secret: 'change-this-secret',
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env['COOKIE_SECURE'] === 'true',
      sameSite: 'lax' as const,
      maxAge: 60000 * 60 * 24, // 24 hours
    },
  },
  passport: {
    enabled: true,
  },
  flash: {
    enabled: true,
  },
};

export function sessionPreset(
  redisConnection: any,
  options: SessionOptions = {},
): MiddlewarePreset {
  const finalOptions = {
    priority: { ...DEFAULT_SESSION_OPTIONS.priority, ...options.priority },
    session: { ...DEFAULT_SESSION_OPTIONS.session, ...options.session },
    passport: { ...DEFAULT_SESSION_OPTIONS.passport, ...options.passport },
    flash: { ...DEFAULT_SESSION_OPTIONS.flash, ...options.flash },
  };

  const middlewares: MiddlewarePreset['middlewares'] = [];

  // Express Session
  if (finalOptions.session.enabled) {
    middlewares.push({
      name: 'session',
      category: 'session',
      priority: finalOptions.priority.session!,
      handler: session({
        secret: finalOptions.session.secret!,
        name: finalOptions.session.name,
        resave: finalOptions.session.resave,
        saveUninitialized: finalOptions.session.saveUninitialized,
        store: new RedisStore({ client: redisConnection }),
        cookie: finalOptions.session.cookie,
        rolling: finalOptions.session.rolling,
        proxy: finalOptions.session.proxy,
        unset: finalOptions.session.unset,
      }) as MiddlewareFn,
    });
  }

  // Passport Initialize
  if (finalOptions.passport.enabled && finalOptions.session.enabled) {
    const initOptions = finalOptions.passport.userProperty
      ? { userProperty: finalOptions.passport.userProperty }
      : undefined;

    middlewares.push({
      name: 'passport-initialize',
      category: 'session',
      priority: finalOptions.priority.passportInitialize!,
      dependencies: ['session'],
      handler: passport.initialize(initOptions) as MiddlewareFn,
    });
  }

  // Passport Session
  if (finalOptions.passport.enabled && finalOptions.session.enabled) {
    middlewares.push({
      name: 'passport-session',
      category: 'session',
      priority: finalOptions.priority.passportSession!,
      dependencies: ['passport-initialize'],
      handler: passport.session() as MiddlewareFn,
    });
  }

  // Connect Flash
  if (finalOptions.flash.enabled && finalOptions.session.enabled) {
    middlewares.push({
      name: 'connect-flash',
      category: 'session',
      priority: finalOptions.priority.flash!,
      dependencies: ['session'],
      handler: flash() as MiddlewareFn,
    });
  }

  return {
    name: 'session',
    middlewares,
  };
}
