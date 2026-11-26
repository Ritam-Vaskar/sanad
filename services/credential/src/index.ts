import Fastify from "fastify";

const port = Number(process.env.PORT ?? 4000);
const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const close = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", close);
process.on("SIGINT", close);

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
