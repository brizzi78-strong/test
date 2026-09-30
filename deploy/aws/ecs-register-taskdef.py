#!/usr/bin/env python3
"""Build and register an ECS task definition for one Fargate service.

Same reason as apprunner-source-config.py: CloudFormation can't expand a
variable-length list of per-service env vars, secrets, or command overrides
into AWS::ECS::TaskDefinition without a custom resource, so the deploy
workflows build the real container definition here and register it directly,
right after the CloudFormation stack creates or updates the surrounding
infrastructure (cluster, EFS volume, roles, load balancer). See
deploy/aws/README.md.

Usage:
  ecs-register-taskdef.py <service-name> <image-uri> <image-tag> <port> \
      <cpu> <memory> <execution-role-arn> <task-role-arn> \
      <filesystem-id> <access-point-id> <log-group> <region> \
      <plain-env-json> <secret-names-csv> <command-json> <account-id>

Registers the task definition with ECS and prints its ARN to stdout.
"""
import json
import subprocess
import sys


def build_task_def(
    service_name, image_uri, image_tag, port, cpu, memory,
    execution_role_arn, task_role_arn, filesystem_id, access_point_id,
    log_group, region, plain_env_json, secret_names_csv, command_json,
    account_id,
) -> dict:
    environment = [{"name": "PORT", "value": port}]
    for name, value in json.loads(plain_env_json).items():
        environment.append({"name": name, "value": value})

    secrets = [
        {
            "name": name,
            "valueFrom": f"arn:aws:ssm:{region}:{account_id}:parameter/cardinal/{service_name}/{name}",
        }
        for name in secret_names_csv.split(",")
        if name
    ]

    container = {
        "name": service_name,
        "image": f"{image_uri}:{image_tag}",
        "portMappings": [{"containerPort": int(port)}],
        "mountPoints": [{"sourceVolume": "data", "containerPath": "/data"}],
        "environment": environment,
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": log_group,
                "awslogs-region": region,
                "awslogs-stream-prefix": service_name,
            },
        },
    }
    if secrets:
        container["secrets"] = secrets
    command = json.loads(command_json)
    if command:
        container["command"] = command

    return {
        "family": service_name,
        "requiresCompatibilities": ["FARGATE"],
        "networkMode": "awsvpc",
        "cpu": cpu,
        "memory": memory,
        "executionRoleArn": execution_role_arn,
        "taskRoleArn": task_role_arn,
        "volumes": [
            {
                "name": "data",
                "efsVolumeConfiguration": {
                    "fileSystemId": filesystem_id,
                    "transitEncryption": "ENABLED",
                    "authorizationConfig": {"accessPointId": access_point_id, "iam": "DISABLED"},
                },
            }
        ],
        "containerDefinitions": [container],
    }


def main() -> None:
    task_def = build_task_def(*sys.argv[1:17])
    result = subprocess.run(
        ["aws", "ecs", "register-task-definition", "--cli-input-json", json.dumps(task_def)],
        capture_output=True, text=True, check=True,
    )
    arn = json.loads(result.stdout)["taskDefinition"]["taskDefinitionArn"]
    print(arn)


if __name__ == "__main__":
    main()
