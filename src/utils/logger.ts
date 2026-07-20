import winston, { createLogger, format, transports } from "winston";
import { LOGGING_LEVEL } from "./config.js";

export abstract class Logger {
  private static readonly customFormat = format.printf(({ level: l, message: m, timestamp: t, ...metadata }) => {
    let msg = `${t} [${l}]: ${m}`;
    if (metadata && JSON.stringify(metadata) !== "{}") {
      msg += JSON.stringify(metadata);
    }
    return msg;
  });

  private static readonly logger: winston.Logger = createLogger({
    transports: [
      new transports.Console({
        level: LOGGING_LEVEL,
        format: process.env.RELEASE ? format.combine(format.splat(), format.timestamp({ format: "YYYY/MM/DD HH:mm:ss" }), Logger.customFormat)
          : format.combine(format.colorize(), format.splat(), format.timestamp({ format: "YYYY/MM/DD HH:mm:ss" }), Logger.customFormat)
      }),
      new transports.File({
        level: "error",
        format: format.combine(format.timestamp(), format.json()),
        filename: `${process.cwd()}/error.log`
      })
    ]
  });

  public static LogError(message: string): void {
    Logger.logger.log("error", message);
  }

  public static LogWarn(message: string): void {
    Logger.logger.log("warn", message);
  }

  public static LogInfo(message: string): void {
    Logger.logger.log("info", message);
  }

  public static LogDebug(message: string): void {
    Logger.logger.log("debug", message);
  }
}