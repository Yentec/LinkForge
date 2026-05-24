import { pino, type LoggerOptions } from 'pino';
import { env } from './env';

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
  redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
};

export const logger = pino(loggerOptions);
