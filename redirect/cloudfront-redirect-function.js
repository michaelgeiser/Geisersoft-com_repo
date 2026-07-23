// CloudFront Function for URL redirects
// Add new redirects to the map below

var redirects = {
  '/AIModelGone': 'https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf',
  '/AwsStaticSites':'https://medium.com/@mgeiser_33377/setting-up-a-static-website-on-aws-in-a-secure-way-in-2026-5e91c175f000',
  '/PoctoProd':'https://medium.com/@mgeiser_33377/the-production-shaped-poc-what-ai-dlc-changes-for-agentic-ai-applications-0d24bce33160',
  '/BeyondAgents':'https://www.linkedin.com/pulse/beyond-agents-why-biggest-ai-revolution-hasnt-happened-geiser-24oge/',
  '/AWSZombies':'https://medium.com/@mgeiser_33377/zombie-aws-instance-types-its-time-to-move-on-ae6407807e6e',
  '/Vibing':'https://medium.com/@mgeiser_33377/enhancing-my-chrome-extension-with-vibe-coding-and-amazon-q-developer-e3f35ef8f660',
  '/QChromeExt':'https://medium.com/@mgeiser_33377/using-q-developer-to-create-a-chrome-extension-in-60-minutes-3b4c4539d746',
  '/reInvent':'https://www.youtube.com/watch?v=9saXQCTYS1k&t=1200s',
  '/AIEarly':'https://www.linkedin.com/pulse/chatgpt-ai-you-need-early-adopter-michael-j-geiser/'
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
