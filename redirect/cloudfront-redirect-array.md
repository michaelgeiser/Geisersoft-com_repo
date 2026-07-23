# CloudFront Function: URL Redirects (Array/Map Version)

This version stores redirects directly in the function code. Simple to set up but requires republishing the function when you add/remove redirects.

## Runtime

- **cloudfront-js-1.0** (or 2.0)

## Function Code

```javascript
// CloudFront Function for URL redirects using an inline map
// Add new redirects to the map below

var redirects = {
  '/AIModelGone': 'https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf'
  // Add more redirects here:
  // '/SomePath': 'https://example.com/target-url'
};

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Remove trailing slash for matching (except root)
  if (uri.length > 1 && uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }

  // Check if the URI matches a redirect
  if (redirects[uri]) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: redirects[uri] },
        'cache-control': { value: 'max-age=86400' }
      }
    };
  }

  // No redirect found, continue with normal request
  return request;
}
```

## Setup Instructions

1. Go to **CloudFront → Functions → Create function**.
2. Name it `geisersoft-redirects`.
3. Paste the code above.
4. Click **Save changes** → **Publish**.
5. Go to **Associated distributions** tab → **Add association**:
   - Distribution: `E38F17UQPVUDDG`
   - Event type: **Viewer Request**
   - Cache behavior: **Default (*)**
6. Click **Add association**.

## Adding Redirects

Edit the function in the CloudFront console, add a line to the `redirects` map, save, and publish.

## Limits

- CloudFront Functions have a **max code size of 10 KB** (after minification).
- At roughly 80-100 bytes per redirect entry, you can fit approximately 80-100 redirects before hitting the limit.
- If you need more, switch to the KeyValueStore version.
