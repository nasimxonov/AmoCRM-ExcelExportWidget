import { validateEnv, type EnvShape } from './env.validation';

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  appUrl: string;
  widgetUrl: string;
  corsOrigins: string[];
  database: {
    url: string;
  };
  redis: {
    url: string | null;
  };
  amocrm: {
    subdomain: string;
    longLivedToken: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenEncryptionKey: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  export: {
    storageDir: string;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

export function buildConfig(env: EnvShape): AppConfig {
  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    appUrl: env.APP_URL,
    widgetUrl: env.WIDGET_URL,
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL.trim().length > 0 ? env.REDIS_URL.trim() : null,
    },
    amocrm: {
      subdomain: env.AMOCRM_SUBDOMAIN,
      longLivedToken: env.AMOCRM_LONG_LIVED_TOKEN,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI.trim().length > 0
        ? env.GOOGLE_OAUTH_REDIRECT_URI
        : `${env.APP_URL.replace(/\/$/, '')}/api/google/oauth/callback`,
      tokenEncryptionKey: env.GOOGLE_TOKEN_ENCRYPTION_KEY,
    },
    security: {
      jwtSecret: env.JWT_SECRET,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
    },
    export: {
      storageDir: env.EXPORT_STORAGE_DIR,
    },
    throttle: {
      ttlSeconds: env.THROTTLE_TTL,
      limit: env.THROTTLE_LIMIT,
    },
  };
}

export default (): AppConfig => buildConfig(validateEnv(process.env));
