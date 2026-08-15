import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

// BigInt is used for every money column (integer rupiah). JSON.stringify can't
// serialize BigInt by default, so every amount would crash the response —
// stringify it instead; the frontend should parse these fields as numbers/strings itself.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? true;
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.use(helmet());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Emerald backend listening on :${port}`);
}

bootstrap();
