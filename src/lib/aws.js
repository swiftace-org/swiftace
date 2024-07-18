import { SESv2Client } from "@aws-sdk/client-sesv2";
import { EnvKeys } from "./constants";
import { assertEnvKeys } from "./validation";

export function makeSes({ env }) {
  assertEnvKeys({
    tag: "makeSes",
    keys: [EnvKeys.awsRegion, EnvKeys.awsAccessKeyId, EnvKeys.awsSecretAccessKey, EnvKeys.awsFromEmail],
    env,
  });

  return new SESv2Client({
    region: env[EnvKeys.awsRegion],
    credentials: {
      accessKeyId: env[EnvKeys.awsAccessKeyId],
      secretAccessKey: env[EnvKeys.awsSecretAccessKey],
    },
  });
}
