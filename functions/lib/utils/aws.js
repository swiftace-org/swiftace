import { SESv2Client } from "@aws-sdk/client-sesv2";
import { ensureEnvVars } from "./cloudflare";

export function makeSes({ env }) {
  ensureEnvVars({
    env,
    func: "makeSes",
    names: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_FROM_EMAIL"],
  });
  return new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}
