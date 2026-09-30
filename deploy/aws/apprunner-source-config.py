#!/usr/bin/env python3
"""Build the --source-configuration JSON for `aws apprunner update-service`.

CloudFormation can't expand a variable-length list of per-service env vars
and secrets into AppRunner::Service's RuntimeEnvironmentVariables /
RuntimeEnvironmentSecrets properties without a custom resource, so the
deploy workflows apply them here, as a follow-up CLI call, right after the
CloudFormation stack creates or updates the service. See deploy/aws/README.md.

Usage:
  apprunner-source-config.py <plain-env-json> <secret-names-csv> \
      <image-uri> <image-tag> <account-id> <region> <service-name> \
      <port> <access-role-arn>

Prints the JSON object to stdout.
"""
import json
import sys


def main() -> None:
    (plain_env_json, secret_names_csv, image_uri, image_tag,
     account_id, region, service_name, port, access_role_arn) = sys.argv[1:10]

    env_vars = [{"Name": "PORT", "Value": port}]
    for name, value in json.loads(plain_env_json).items():
        env_vars.append({"Name": name, "Value": value})

    secrets = [
        {
            "Name": name,
            "Value": f"arn:aws:ssm:{region}:{account_id}:parameter/cardinal/{service_name}/{name}",
        }
        for name in secret_names_csv.split(",")
        if name
    ]

    image_config = {"Port": port, "RuntimeEnvironmentVariables": env_vars}
    if secrets:
        image_config["RuntimeEnvironmentSecrets"] = secrets

    config = {
        "ImageRepository": {
            "ImageIdentifier": f"{image_uri}:{image_tag}",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": image_config,
        },
        "AuthenticationConfiguration": {"AccessRoleArn": access_role_arn},
        "AutoDeploymentsEnabled": False,
    }
    print(json.dumps(config))


if __name__ == "__main__":
    main()
