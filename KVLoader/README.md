# KVLoader — CloudFront KeyValueStore Upsert/Delete Lambda

A Python Lambda function that programmatically inserts, updates, or deletes entries in a CloudFront KeyValueStore. Designed to be invoked by an upstream Lambda that consumes CDC (Change Data Capture) events from an SQS queue.

## Architecture Context

```
CDC Source → SQS Queue → Consumer Lambda → KVLoader Lambda → CloudFront KeyValueStore
```

The upstream consumer Lambda processes SQS messages and invokes KVLoader synchronously. KVLoader returns a structured response with an **error classification** so the consumer can decide:

- **Success** → acknowledge the SQS message
- **Nonrecoverable error** → route to dead-letter queue (DLQ), do not retry
- **Recoverable error** → retry with backoff or let SQS visibility timeout redeliver

## Input Payload

```json
{
  "key": "/AIModelGone",
  "value": "https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf",
  "kvstore": "arn:aws:cloudfront::358227436652:key-value-store/your-kvs-uuid",
  "doDeleteFlag": false
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | The key to upsert or delete. Must start with `/`, contain valid URL path characters, max 512 bytes. |
| `value` | string | For upsert | The redirect target URL. Must be a well-formed HTTPS URL, max 1024 bytes. Not required when `doDeleteFlag` is `true`. |
| `kvstore` | string | Yes | Full ARN of the CloudFront KeyValueStore. Must be a valid ARN and the store must exist. |
| `doDeleteFlag` | boolean | Yes | `true` to delete the key, `false` to upsert (insert or update). |

## Error Classification

All responses include an `errorClass` field to guide the caller's retry logic:

| Error Class | Value | Meaning | Caller Action |
|-------------|-------|---------|---------------|
| None | `null` | Operation succeeded | Acknowledge the SQS message |
| Nonrecoverable | `"nonrecoverable"` | The request is fundamentally invalid or the target doesn't exist. Retrying will never succeed. | Send to DLQ, log, alert |
| Recoverable | `"recoverable"` | A transient issue prevented the operation. The request is valid and may succeed on retry. | Retry with exponential backoff or let SQS redeliver |

### Nonrecoverable Error Examples

- Input validation failures (bad key format, non-HTTPS URL, invalid ARN, wrong type)
- KeyValueStore not found (bad ARN)
- Access denied (IAM misconfiguration)
- Key not found on delete (nothing to delete — idempotent success in some designs, but flagged here)

### Recoverable Error Examples

- Service temporarily unavailable
- Request throttled (rate limit exceeded)
- Network timeout or connection error
- ETag conflict (concurrent modification — safe to retry, will get fresh ETag)
- Internal service errors

## Response Format

### Success

```json
{
  "status": "SUCCESS",
  "errorClass": null,
  "operation": "UPSERT",
  "key": "/AIModelGone",
  "message": "Successfully upserted key '/AIModelGone'"
}
```

### Nonrecoverable Error (Validation)

```json
{
  "status": "ERROR",
  "errorClass": "nonrecoverable",
  "operation": "VALIDATION",
  "key": "/bad key",
  "message": "Input validation failed with 2 error(s)",
  "errors": [
    "Parameter 'key' must start with '/' and contain only valid URL path characters...",
    "Parameter 'value' must be a well-formed HTTPS URL..."
  ]
}
```

### Recoverable Error (Throttling)

```json
{
  "status": "ERROR",
  "errorClass": "recoverable",
  "operation": "UPSERT",
  "key": "/AIModelGone",
  "message": "Failed to upsert key '/AIModelGone': [Throttling] Rate exceeded"
}
```

## Caller Integration Pattern

The upstream consumer Lambda should handle the response like this:

```python
import boto3
import json

lambda_client = boto3.client('lambda')

def process_sqs_record(record):
    """Process a single SQS message by invoking KVLoader."""
    payload = json.loads(record['body'])

    response = lambda_client.invoke(
        FunctionName='KVLoader',
        InvocationType='RequestResponse',
        Payload=json.dumps(payload)
    )

    result = json.loads(response['Payload'].read())

    if result['status'] == 'SUCCESS':
        # Operation succeeded — message will be acknowledged
        return True

    elif result['errorClass'] == 'nonrecoverable':
        # Log and send to DLQ — retrying will never fix this
        print(f"NONRECOVERABLE: {result['message']}")
        send_to_dlq(record, result)
        return True  # Acknowledge so SQS doesn't redeliver

    elif result['errorClass'] == 'recoverable':
        # Raise an exception so SQS redelivers after visibility timeout
        raise Exception(f"RECOVERABLE: {result['message']}")
```

## Validation Rules

All validations run before any operation is attempted. All errors are collected and returned together.

| Parameter | Rule | Error Class |
|-----------|------|-------------|
| `key` | Must be a non-empty string | nonrecoverable |
| `key` | Must start with `/` | nonrecoverable |
| `key` | Only valid URL path characters | nonrecoverable |
| `key` | Max 512 bytes | nonrecoverable |
| `value` | Must be a non-empty string (upsert only) | nonrecoverable |
| `value` | Must be a well-formed `https://` URL | nonrecoverable |
| `value` | Max 1024 bytes | nonrecoverable |
| `kvstore` | Must be a valid CloudFront KVS ARN | nonrecoverable |
| `kvstore` | Store must exist and be accessible | nonrecoverable |
| `doDeleteFlag` | Must be a boolean (`true` or `false`) | nonrecoverable |

## IAM Permissions Required

The KVLoader Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront-keyvaluestore:DescribeKeyValueStore",
        "cloudfront-keyvaluestore:GetKey",
        "cloudfront-keyvaluestore:PutKey",
        "cloudfront-keyvaluestore:DeleteKey"
      ],
      "Resource": "arn:aws:cloudfront::358227436652:key-value-store/*"
    }
  ]
}
```

## Deployment

### Option 1: AWS Console

1. Go to **Lambda → Create function**.
2. Name: `KVLoader`
3. Runtime: **Python 3.12**
4. Architecture: x86_64 or arm64
5. Paste the contents of `lambda_function.py` into the inline editor.
6. Under **Configuration → Permissions**, attach the IAM policy above to the execution role.
7. Set timeout to **30 seconds** (KVS operations can take a few seconds).

### Option 2: AWS CLI

```cmd
zip KVLoader.zip lambda_function.py

aws lambda create-function ^
  --function-name KVLoader ^
  --runtime python3.12 ^
  --handler lambda_function.lambda_handler ^
  --role arn:aws:iam::358227436652:role/YOUR_LAMBDA_ROLE ^
  --zip-file fileb://KVLoader.zip ^
  --timeout 30
```

## Testing

### Upsert a redirect

```json
{
  "key": "/TestRedirect",
  "value": "https://example.com/test-page",
  "kvstore": "arn:aws:cloudfront::358227436652:key-value-store/your-kvs-uuid",
  "doDeleteFlag": false
}
```

### Delete a redirect

```json
{
  "key": "/TestRedirect",
  "kvstore": "arn:aws:cloudfront::358227436652:key-value-store/your-kvs-uuid",
  "doDeleteFlag": true
}
```

### Trigger validation errors (nonrecoverable)

```json
{
  "key": "missing-leading-slash",
  "value": "http://not-https.com",
  "kvstore": "not-a-valid-arn",
  "doDeleteFlag": "not-a-boolean"
}
```

## Dependencies

- **boto3** (included in the Lambda runtime — no additional packaging needed)
- **Python 3.12** (or 3.9+)

## Notes

- The function uses the KeyValueStore ETag for optimistic concurrency control. ETag conflicts are classified as recoverable since a retry will fetch a fresh ETag.
- CloudFront KeyValueStore limits: max key size 512 bytes, max value size 1 KB, max store size 5 MB.
- Changes to the KeyValueStore propagate globally within seconds — no CloudFront Function republish needed.
- The upstream consumer should use SQS batch processing with partial failure reporting (`ReportBatchItemFailures`) for optimal throughput and error handling.
