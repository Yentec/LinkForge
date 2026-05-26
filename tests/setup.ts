import { inject } from 'vitest';

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = inject('databaseUrl');
process.env['BASE_URL'] = 'http://localhost:3000';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_SECRET'] = 'test-secret-at-least-32-characters-long-xx';
process.env['IP_HASH_SALT'] = 'test-salt-16chars';
