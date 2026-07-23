# CloudFront Function: URL Redirects (KeyValueStore Version)

This version reads redirects from a CloudFront KeyValueStore. You can add, update, or remove redirects without touching the function code.

## Runtime

- **cloudfront-js-2.0** (required for KVS access)

## Function Code

```javascript
// CloudFront Function for URL redirects using KeyValueStore
// Runtime: cloudfront-js-2.0

import cf from 'cloudfront';

// Replace with your KeyValueStore ID after creating it
var kvsId = 'REPLACE_WITH_KVS_ID';
var kvsHandle = cf.kvs(kvsId);

async function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Remove trailing slash for matching (except root)
  if (uri.length > 1 && uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }

  // Look up the URI in the KeyValueStore
  try {
    var redirectUrl = await kvsHandle.get(uri);
    if (redirectUrl) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: {
          'location': { value: redirectUrl },
          'cache-control': { value: 'max-age=86400' }
        }
      };
    }
  } catch (err) {
    // Key not found — not an error, just no redirect for this path
  }

  // No redirect found, continue with normal request
  return request;
}
```

## Setup Instructions

### Step 1: Create the KeyValueStore

1. Go to **CloudFront → KeyValueStore** (left sidebar) → **Create**.
2. Name it `geisersoft-redirects`.
3. Click **Create key value store**.
4. Copy the **KVS ID** from the details page (a UUID like `a1b2c3d4-...`).

### Step 2: Add Your Redirects

In the KeyValueStore details page, add key-value pairs:

| Key | Value |
|-----|-------|
| `/AIModelGone` | `https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf` |

Or via CLI:

```cmd
aws cloudfront-keyvaluestore put-key ^
  --kvs-arn arn:aws:cloudfront::358227436652:key-value-store/YOUR_KVS_ID ^
  --key "/AIModelGone" ^
  --value "https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf" ^
  --if-match ETAG_VALUE
```

(Get the ETag from `aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn ...`)

### Step 3: Create the CloudFront Function

1. Go to **CloudFront → Functions → Create function**.
2. Name it `geisersoft-redirects`.
3. Set runtime to **cloudfront-js-2.0**.
4. Paste the code above, replacing `REPLACE_WITH_KVS_ID` with your actual KVS ID.
5. In the **Associated key value stores** section, click **Add KVS** and select `geisersoft-redirects`.
6. Click **Save changes** → **Publish**.

### Step 4: Associate with Distribution

1. In the function page, go to **Associated distributions** → **Add association**.
2. Choose:
   - Distribution: `E38F17UQPVUDDG`
   - Event type: **Viewer Request**
   - Cache behavior: **Default (*)**
3. Click **Add association**.

## Adding Redirects Later

Just add key-value pairs to the store — no function changes needed:

```cmd
aws cloudfront-keyvaluestore put-key ^
  --kvs-arn arn:aws:cloudfront::358227436652:key-value-store/YOUR_KVS_ID ^
  --key "/NewPage" ^
  --value "https://example.com/wherever" ^
  --if-match ETAG_VALUE
```

Or use the AWS Console: CloudFront → KeyValueStore → geisersoft-redirects → Add key-value pair.

## Limits

| Limit | Value |
|-------|-------|
| Max total size per store | 5 MB |
| Max key size | 512 bytes |
| Max value size | 1 KB |
| Max KeyValueStores per account | 10 |
| Max KVS associations per function | 1 |

With typical redirect entries (~150 bytes each), you can store **thousands** of redirects.

## Comparison to Array Version

| | Array | KeyValueStore |
|---|---|---|
| Add redirects | Edit + republish function | Add key-value pair (no deploy) |
| Max redirects | ~80-100 (10 KB code limit) | Thousands (5 MB store) |
| Runtime | 1.0 or 2.0 | 2.0 only |
| Setup complexity | Lower | Slightly higher |
