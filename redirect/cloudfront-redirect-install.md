To add more redirects, add entries to the redirects map.

To deploy it, here's what you do in the AWS Console:

Go to CloudFront → Functions (left sidebar).
Click Create function.
Name it something like geisersoft-redirects.
Paste the contents of cloudfront-redirect-function.js into the editor.
Click Save changes, then click Publish.
Go to the Associated distributions tab → click Add association.
Choose:
    Distribution: E38F17UQPVUDDG
    Event type: Viewer Request
    Cache behavior: Default (*)
Click Add association.

That's it. Within a minute or two, https://www.geisersoft.com/AIModelGone will 301 redirect to your Medium article.

To add more redirects later, just add lines to the map:


var redirects = {
  '/AIModelGone': 'https://medium.com/@mgeiser_33377/when-your-ai-model-just-disappears-502e753c41bf',
  '/AnotherPage': 'https://example.com/wherever',
  '/Resume': 'https://linkedin.com/in/yourprofile'
};
Then update the function in the CloudFront console (or we can add it to the pipeline later if you want automated deploys of the function too).

