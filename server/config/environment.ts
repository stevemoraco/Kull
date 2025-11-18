export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production'
}

export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
}

export interface EnvironmentConfig {
  environment: Environment;
  port: number;
  databaseURL: string;

  // Provider API keys (server-side ONLY - NEVER send to client)
  anthropic: ProviderConfig;
  openai: ProviderConfig;
  google: ProviderConfig;
  grok: ProviderConfig;
  groq: ProviderConfig;

  // Client-facing URLs (safe to expose)
  clientBaseURL: string;
  clientWSURL: string;

  // Security
  jwtSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;

  // Rate limiting
  rateLimitWindow: number;      // milliseconds
  rateLimitMaxRequests: number; // max requests per window
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  const env = (process.env.NODE_ENV as Environment) || Environment.Development;

  return {
    environment: env,
    port: parseInt(process.env.PORT || '5000'),
    databaseURL: process.env.DATABASE_URL!,

    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: 'https://api.anthropic.com/v1',
      timeout: 60000
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY!,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 60000
    },
    grok: {
      apiKey: process.env.GROK_API_KEY || '',  // Optional
      baseURL: 'https://api.x.ai/v1',
      timeout: 60000
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',  // Optional
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 30000
    },

    clientBaseURL: getClientBaseURL(env),
    clientWSURL: getClientWSURL(env),

    jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET!,
    jwtAccessExpiry: '1h',
    jwtRefreshExpiry: '30d',

    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30000')
  };
}

function getClientBaseURL(env: Environment): string {
  switch (env) {
    case Environment.Development:
      return 'http://localhost:5000';
    case Environment.Staging:
      return 'https://staging.kullai.com';
    case Environment.Production:
      return 'https://kullai.com';
  }
}

function getClientWSURL(env: Environment): string {
  switch (env) {
    case Environment.Development:
      return 'ws://localhost:5000';
    case Environment.Staging:
      return 'wss://staging.kullai.com';
    case Environment.Production:
      return 'wss://kullai.com';
  }
}

export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const requiredKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missing = requiredKeys.filter(key => !process.env[key] && (key !== 'JWT_SECRET' || !process.env.SESSION_SECRET));

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `Please create a .env file based on .env.example`
    );
  }

  console.log(`✅ Environment configuration loaded: ${config.environment}`);
  console.log(`✅ Client base URL: ${config.clientBaseURL}`);
  console.log(`✅ All required API keys present`);
}

// Export config and validate only if not in test mode
export const config = loadEnvironmentConfig();
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  validateEnvironmentConfig(config);
}
