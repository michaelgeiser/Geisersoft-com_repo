// Lambda@Edge: Origin Response Handler
// Associate this function with your CloudFront distribution as a "viewer response" event.
//
// This function intercepts S3 error responses, parses the XML error body
// (which contains Code, Message, Key, RequestId, HostId), and redirects to
// /errorpages/error.html with the error details as query parameters for the debug panel.
//
// NOTE: This fires on EVERY origin response (not just errors). The function checks
// the status code and passes through non-error responses untouched, but you still
// pay per invocation.
//
// Deployment steps:
// 1. Create a Lambda function in us-east-1 (required for Lambda@Edge)
// 2. Use Node.js 20.x runtime
// 3. Set the handler to index.handler
// 4. Attach the Lambda@Edge execution role (see cf-error-handler-stack.yaml)
// 5. Publish a version of the function
// 6. Associate the published version ARN with your CloudFront distribution's
//    default cache behavior under "Origin response" event
// 7. Set "Include Body" to Yes

'use strict';

exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;
    const statusCode = parseInt(response.status, 10);

    // Only handle error responses
    if (statusCode < 400) {
        return response;
    }

    // Don't rewrite if already on the error page (prevent loops)
    if (request.uri.startsWith('/errorpages/')) {
        return response;
    }

    // Parse S3 XML error body if present
    let awsCode = '';
    let awsMessage = '';
    let awsKey = '';
    let awsRequestId = '';
    let awsHostId = '';

    const body = response.body || '';
    if (body && body.includes('<Error>')) {
        awsCode = extractXmlTag(body, 'Code');
        awsMessage = extractXmlTag(body, 'Message');
        awsKey = extractXmlTag(body, 'Key');
        awsRequestId = extractXmlTag(body, 'RequestId');
        awsHostId = extractXmlTag(body, 'HostId');
    }

    // Build query string with error details
    const params = new URLSearchParams();
    params.set('status', statusCode.toString());
    params.set('originalurl', request.uri);
    if (awsCode) params.set('code', awsCode);
    if (awsMessage) params.set('message', awsMessage);
    if (awsKey) params.set('key', awsKey);
    if (awsRequestId) params.set('requestid', awsRequestId);
    if (awsHostId) params.set('hostid', awsHostId);

    // Redirect to generic error page
    const redirectUrl = '/errorpages/error.html?' + params.toString();

    return {
        status: '302',
        statusDescription: 'Found',
        headers: {
            'location': [{ key: 'Location', value: redirectUrl }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]
        }
    };
};

function extractXmlTag(xml, tag) {
    const match = xml.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'));
    return match ? match[1] : '';
}
