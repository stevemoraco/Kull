import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Environment, loadEnvironmentConfig, validateEnvironmentConfig } from './environment';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('loadEnvironmentConfig', () => {
    it('should load config from environment variables', () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '5000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.environment).toBe(Environment.Development);
      expect(config.port).toBe(5000);
      expect(config.databaseURL).toBe('postgresql://localhost/test');
      expect(config.anthropic.apiKey).toBe('sk-ant-test');
      expect(config.openai.apiKey).toBe('sk-openai-test');
      expect(config.google.apiKey).toBe('AIza-test');
      expect(config.jwtSecret).toBe('test-secret');
    });

    it('should default to development environment if NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.environment).toBe(Environment.Development);
    });

    it('should use SESSION_SECRET as fallback for JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      process.env.SESSION_SECRET = 'session-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';

      const config = loadEnvironmentConfig();

      expect(config.jwtSecret).toBe('session-secret');
    });

    it('should set optional provider keys to empty string if not provided', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.GROK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const config = loadEnvironmentConfig();

      expect(config.grok.apiKey).toBe('');
      expect(config.groq.apiKey).toBe('');
    });

    it('should return correct URLs for development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.clientBaseURL).toBe('http://localhost:5000');
      expect(config.clientWSURL).toBe('ws://localhost:5000');
    });

    it('should return correct URLs for staging environment', () => {
      process.env.NODE_ENV = 'staging';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.clientBaseURL).toBe('https://staging.kullai.com');
      expect(config.clientWSURL).toBe('wss://staging.kullai.com');
    });

    it('should return correct URLs for production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.clientBaseURL).toBe('https://kullai.com');
      expect(config.clientWSURL).toBe('wss://kullai.com');
    });

    it('should set default port to 5000 if not provided', () => {
      delete process.env.PORT;
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.port).toBe(5000);
    });

    it('should set default rate limit values if not provided', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.rateLimitWindow).toBe(60000);
      expect(config.rateLimitMaxRequests).toBe(30000);
    });

    it('should configure all provider configs with correct base URLs', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.GROK_API_KEY = 'xai-test';
      process.env.GROQ_API_KEY = 'gsk-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.anthropic.baseURL).toBe('https://api.anthropic.com/v1');
      expect(config.openai.baseURL).toBe('https://api.openai.com/v1');
      expect(config.google.baseURL).toBe('https://generativelanguage.googleapis.com/v1beta');
      expect(config.grok.baseURL).toBe('https://api.x.ai/v1');
      expect(config.groq.baseURL).toBe('https://api.groq.com/openai/v1');
    });

    it('should configure all provider configs with correct timeouts', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.GROK_API_KEY = 'xai-test';
      process.env.GROQ_API_KEY = 'gsk-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.anthropic.timeout).toBe(60000);
      expect(config.openai.timeout).toBe(60000);
      expect(config.google.timeout).toBe(60000);
      expect(config.grok.timeout).toBe(60000);
      expect(config.groq.timeout).toBe(30000); // Groq has shorter timeout
    });

    it('should set JWT token expiry times correctly', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';

      const config = loadEnvironmentConfig();

      expect(config.jwtAccessExpiry).toBe('1h');
      expect(config.jwtRefreshExpiry).toBe('30d');
    });
  });

  describe('validateEnvironmentConfig', () => {
    it('should not throw error when all required vars are present', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config = loadEnvironmentConfig();

      // Mock console.log to avoid output during tests
      const originalLog = console.log;
      console.log = () => {};

      expect(() => validateEnvironmentConfig(config)).not.toThrow();

      console.log = originalLog;
    });

    it('should throw error when ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/ANTHROPIC_API_KEY/);
    });

    it('should throw error when OPENAI_API_KEY is missing', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      delete process.env.OPENAI_API_KEY;
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/OPENAI_API_KEY/);
    });

    it('should throw error when GOOGLE_API_KEY is missing', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      delete process.env.GOOGLE_API_KEY;
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/GOOGLE_API_KEY/);
    });

    it('should throw error when JWT_SECRET and SESSION_SECRET are both missing', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/JWT_SECRET/);
    });

    it('should throw error when DATABASE_URL is missing', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.DATABASE_URL;

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/DATABASE_URL/);
    });

    it('should throw error with all missing vars listed', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;
      delete process.env.DATABASE_URL;

      const config = loadEnvironmentConfig();

      expect(() => validateEnvironmentConfig(config)).toThrow(/ANTHROPIC_API_KEY.*OPENAI_API_KEY.*GOOGLE_API_KEY.*JWT_SECRET.*DATABASE_URL/s);
    });

    it('should not throw error when optional keys are missing', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      delete process.env.GROK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const config = loadEnvironmentConfig();

      // Mock console.log
      const originalLog = console.log;
      console.log = () => {};

      expect(() => validateEnvironmentConfig(config)).not.toThrow();

      console.log = originalLog;
    });
  });
});
