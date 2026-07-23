"""
KVLoader Lambda Function
-------------------------
Performs upsert or delete operations on a CloudFront KeyValueStore entry.

This function is designed to be invoked by an upstream Lambda that consumes
CDC (Change Data Capture) events from an SQS queue. The response format
includes an error classification ("recoverable" or "nonrecoverable") so the
caller can decide whether to retry or send the message to a dead-letter queue.

Accepts a JSON payload with:
  - key: The key to upsert or delete (must start with '/' and contain valid URL path characters)
  - value: The redirect target URL (must be a well-formed HTTPS URL; required for upsert)
  - kvstore: The ARN of the CloudFront KeyValueStore (must exist)
  - doDeleteFlag: Boolean flag - true to delete the key, false to upsert

Returns a JSON response with status, error classification, and descriptive message.
"""

import json
import re
import boto3
from botocore.exceptions import ClientError, EndpointConnectionError, ReadTimeoutError


# ---------------------------------------------------------------------------
# Error Classification
# ---------------------------------------------------------------------------

class ErrorClass:
    """
    Classifies errors to inform the calling Lambda how to handle failures.

    NONRECOVERABLE: The request is invalid or the target resource does not exist.
        No amount of retries will succeed. The caller should log the error and
        route the message to a dead-letter queue (DLQ).
        Examples: validation failures, malformed ARNs, key not found on delete.

    RECOVERABLE: A transient infrastructure issue prevented the operation.
        The caller should retry with exponential backoff or allow SQS visibility
        timeout to re-deliver the message.
        Examples: throttling, service unavailable, network timeouts, ETag conflicts.
    """
    NONRECOVERABLE = "nonrecoverable"
    RECOVERABLE = "recoverable"


# ---------------------------------------------------------------------------
# Response Builders
# ---------------------------------------------------------------------------

def success_response(operation, key, message):
    """Builds a standardized success response."""
    return {
        'status': 'SUCCESS',
        'errorClass': None,
        'operation': operation,
        'key': key,
        'message': message
    }


def error_response(error_class, operation, key, message, errors=None):
    """
    Builds a standardized error response.

    Args:
        error_class: ErrorClass.RECOVERABLE or ErrorClass.NONRECOVERABLE
        operation: The attempted operation ('UPSERT', 'DELETE', or 'VALIDATION')
        key: The key being operated on (may be None for validation errors)
        message: Human-readable summary of what went wrong
        errors: Optional list of individual validation error strings
    """
    response = {
        'status': 'ERROR',
        'errorClass': error_class,
        'operation': operation,
        'key': key,
        'message': message
    }
    if errors:
        response['errors'] = errors
    return response


# ---------------------------------------------------------------------------
# Input Validation
# ---------------------------------------------------------------------------

# Key must start with '/' and contain only URL-safe path characters
KEY_PATTERN = re.compile(r'^/[a-zA-Z0-9\-._~:/?#\[\]@!$&\'()*+,;=%]+$')

# Value must be a well-formed HTTPS URL
HTTPS_URL_PATTERN = re.compile(
    r'^https://'                # Must start with https://
    r'[a-zA-Z0-9]'             # Domain must start with alphanumeric
    r'[a-zA-Z0-9\-\.]*'        # Domain body (alphanumeric, hyphens, dots)
    r'\.[a-zA-Z]{2,}'          # TLD (at least 2 characters)
    r'(/[^\s]*)?$'             # Optional path
)

# CloudFront KeyValueStore ARN pattern
KVS_ARN_PATTERN = re.compile(
    r'^arn:aws:cloudfront::[0-9]{12}:key-value-store/[a-f0-9\-]{36}$'
)


def validate_inputs(event):
    """
    Validates all input parameters from the event payload.

    All validations run regardless of earlier failures so the caller receives
    a complete list of problems in a single response.

    Returns:
        list: Validation error messages. Empty list means all inputs are valid.
    """
    errors = []

    # --- Validate 'key' parameter ---
    key = event.get('key')
    if key is None:
        errors.append("Missing required parameter: 'key'")
    elif not isinstance(key, str):
        errors.append("Parameter 'key' must be a string")
    elif len(key) == 0:
        errors.append("Parameter 'key' cannot be empty")
    elif len(key.encode('utf-8')) > 512:
        errors.append(f"Parameter 'key' exceeds maximum length of 512 bytes (got {len(key.encode('utf-8'))})")
    elif not KEY_PATTERN.match(key):
        errors.append(
            "Parameter 'key' must start with '/' and contain only valid URL path characters "
            "(alphanumeric, hyphens, dots, underscores, tildes, and standard URL characters)"
        )

    # --- Validate 'doDeleteFlag' parameter ---
    do_delete_flag = event.get('doDeleteFlag')
    if do_delete_flag is None:
        errors.append("Missing required parameter: 'doDeleteFlag'")
    elif not isinstance(do_delete_flag, bool):
        errors.append("Parameter 'doDeleteFlag' must be a boolean (true or false)")

    # --- Validate 'value' parameter (required for upsert, not required for delete) ---
    value = event.get('value')
    is_delete = isinstance(do_delete_flag, bool) and do_delete_flag

    if not is_delete:
        if value is None:
            errors.append("Missing required parameter: 'value' (required when doDeleteFlag is false)")
        elif not isinstance(value, str):
            errors.append("Parameter 'value' must be a string")
        elif len(value) == 0:
            errors.append("Parameter 'value' cannot be empty")
        elif len(value.encode('utf-8')) > 1024:
            errors.append(f"Parameter 'value' exceeds maximum length of 1024 bytes (got {len(value.encode('utf-8'))})")
        elif not HTTPS_URL_PATTERN.match(value):
            errors.append(
                "Parameter 'value' must be a well-formed HTTPS URL "
                "(e.g., https://example.com/path)"
            )

    # --- Validate 'kvstore' parameter ---
    kvstore = event.get('kvstore')
    if kvstore is None:
        errors.append("Missing required parameter: 'kvstore'")
    elif not isinstance(kvstore, str):
        errors.append("Parameter 'kvstore' must be a string")
    elif len(kvstore) == 0:
        errors.append("Parameter 'kvstore' cannot be empty")
    elif not KVS_ARN_PATTERN.match(kvstore):
        errors.append(
            "Parameter 'kvstore' must be a valid CloudFront KeyValueStore ARN "
            "(format: arn:aws:cloudfront::<account-id>:key-value-store/<uuid>)"
        )

    return errors


# ---------------------------------------------------------------------------
# KeyValueStore Operations
# ---------------------------------------------------------------------------

# AWS error codes that indicate transient/recoverable conditions
RECOVERABLE_ERROR_CODES = {
    'ServiceUnavailable',
    'Throttling',
    'ThrottlingException',
    'RequestLimitExceeded',
    'InternalServiceError',
    'InternalFailure',
    'ConflictException',       # ETag mismatch — concurrent modification, safe to retry
    'TooManyRequestsException',
}


def classify_client_error(error_code):
    """
    Determines whether a boto3 ClientError is recoverable based on its error code.

    Args:
        error_code: The AWS error code string from the ClientError response.

    Returns:
        ErrorClass.RECOVERABLE or ErrorClass.NONRECOVERABLE
    """
    if error_code in RECOVERABLE_ERROR_CODES:
        return ErrorClass.RECOVERABLE
    return ErrorClass.NONRECOVERABLE


def get_kvs_etag(client, kvs_arn):
    """
    Retrieves the current ETag for the KeyValueStore.
    The ETag is required for all mutating operations to ensure consistency.

    Returns:
        tuple: (etag_string, error_response_dict_or_None)
    """
    try:
        response = client.describe_key_value_store(KvsARN=kvs_arn)
        return response['ETag'], None

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_class = classify_client_error(error_code)

        # EntityNotFound and AccessDenied are never recoverable for this call
        if error_code == 'EntityNotFound':
            return None, error_response(
                ErrorClass.NONRECOVERABLE, None, None,
                f"KeyValueStore not found: {kvs_arn}. Verify the ARN is correct."
            )
        elif error_code == 'AccessDenied':
            return None, error_response(
                ErrorClass.NONRECOVERABLE, None, None,
                f"Access denied to KeyValueStore: {kvs_arn}. Check Lambda IAM permissions."
            )
        else:
            return None, error_response(
                error_class, None, None,
                f"Error accessing KeyValueStore: [{error_code}] {e.response['Error']['Message']}"
            )

    except (EndpointConnectionError, ReadTimeoutError) as e:
        return None, error_response(
            ErrorClass.RECOVERABLE, None, None,
            f"Network error connecting to KeyValueStore service: {str(e)}"
        )


def upsert_key(client, kvs_arn, key, value, etag):
    """
    Inserts or updates a key-value pair in the KeyValueStore.

    Returns:
        dict: A success or error response dictionary.
    """
    try:
        client.put_key(
            KvsARN=kvs_arn,
            Key=key,
            Value=value,
            IfMatch=etag
        )
        return success_response('UPSERT', key, f"Successfully upserted key '{key}'")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_class = classify_client_error(error_code)
        return error_response(
            error_class, 'UPSERT', key,
            f"Failed to upsert key '{key}': [{error_code}] {e.response['Error']['Message']}"
        )

    except (EndpointConnectionError, ReadTimeoutError) as e:
        return error_response(
            ErrorClass.RECOVERABLE, 'UPSERT', key,
            f"Network error during upsert of key '{key}': {str(e)}"
        )


def delete_key(client, kvs_arn, key, etag):
    """
    Deletes a key from the KeyValueStore.

    Returns:
        dict: A success or error response dictionary.
    """
    try:
        client.delete_key(
            KvsARN=kvs_arn,
            Key=key,
            IfMatch=etag
        )
        return success_response('DELETE', key, f"Successfully deleted key '{key}'")

    except ClientError as e:
        error_code = e.response['Error']['Code']

        # Key not found on delete is nonrecoverable — retrying won't help
        if error_code == 'EntityNotFound':
            return error_response(
                ErrorClass.NONRECOVERABLE, 'DELETE', key,
                f"Key '{key}' does not exist in the KeyValueStore — nothing to delete"
            )

        error_class = classify_client_error(error_code)
        return error_response(
            error_class, 'DELETE', key,
            f"Failed to delete key '{key}': [{error_code}] {e.response['Error']['Message']}"
        )

    except (EndpointConnectionError, ReadTimeoutError) as e:
        return error_response(
            ErrorClass.RECOVERABLE, 'DELETE', key,
            f"Network error during delete of key '{key}': {str(e)}"
        )


# ---------------------------------------------------------------------------
# Lambda Handler
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    """
    Main Lambda entry point. Called by the upstream CDC consumer Lambda.

    Validates inputs, performs the requested operation, and returns a response
    with error classification to guide the caller's retry/DLQ logic.

    Expected event payload:
    {
        "key": "/AIModelGone",
        "value": "https://medium.com/@mgeiser_33377/article-slug",
        "kvstore": "arn:aws:cloudfront::358227436652:key-value-store/uuid",
        "doDeleteFlag": false
    }

    Returns:
        dict: Response with 'status', 'errorClass', 'operation', 'key', and 'message'.
              The caller should check 'errorClass' to determine retry behavior:
              - None: operation succeeded
              - "nonrecoverable": send to DLQ, do not retry
              - "recoverable": retry with backoff or let SQS redeliver
    """

    # --- Input Validation (all failures are nonrecoverable) ---
    validation_errors = validate_inputs(event)

    if validation_errors:
        return error_response(
            ErrorClass.NONRECOVERABLE,
            'VALIDATION',
            event.get('key'),
            f"Input validation failed with {len(validation_errors)} error(s)",
            errors=validation_errors
        )

    # --- Extract validated inputs ---
    key = event['key']
    value = event.get('value')
    kvstore_arn = event['kvstore']
    do_delete = event['doDeleteFlag']

    # --- Initialize CloudFront KeyValueStore client ---
    client = boto3.client('cloudfront-keyvaluestore')

    # --- Verify the KeyValueStore exists and get its ETag ---
    etag, etag_error = get_kvs_etag(client, kvstore_arn)
    if etag_error:
        # Carry forward the operation context
        etag_error['operation'] = 'DELETE' if do_delete else 'UPSERT'
        etag_error['key'] = key
        return etag_error

    # --- Perform the requested operation ---
    if do_delete:
        return delete_key(client, kvstore_arn, key, etag)
    else:
        return upsert_key(client, kvstore_arn, key, value, etag)
