# Error Pages - Lambda@Edge Alternative

This is the Lambda@Edge version of the error handler that captures **full AWS error details**
(RequestId, HostId) from the S3 XML response body. It provides more debug information than
the CloudFront custom error response approach used in `/errorpages/`.

## Trade-offs vs. CloudFront Custom Error Responses (`/errorpages/`)

| | Lambda@Edge (this) | Custom Error Responses (`/errorpages/`) |
|---|---|---|
| RequestId / HostId | ✅ Yes | ❌ No |
| S3 error Code/Message | ✅ Yes | ❌ No (hardcoded per status) |
| Cost | Per-invocation (fires on ALL responses) | Free |
| Latency | +1-5ms on every request | None |
| Complexity | Lambda + IAM + versioning | CloudFront config only |

## When to use this

- You need RequestId/HostId for AWS support tickets
- You're debugging intermittent origin errors and need full context
- Cost is not a concern for your traffic volume

## Deployment

See `cf-error-handler-stack.yaml` for the CloudFormation template and deployment instructions.
This stack must be deployed in **us-east-1**.
