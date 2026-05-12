const https = require('https');
const countries = ['usa landmark', 'london uk', 'canada landscape', 'dubai burj khalifa', 'japan tokyo', 'australia sydney', 'singapore marina', 'turkey istanbul', 'india taj mahal', 'paris france', 'thailand bangkok', 'indonesia bali', 'germany berlin', 'italy rome'];

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  for (const c of countries) {
    const html = await fetchHtml('https://unsplash.com/s/photos/' + encodeURIComponent(c));
    const match = html.match(/"id":"([a-zA-Z0-9_\-]+)","slug"/);
    if (match && match[1]) {
      console.log(c.split(' ')[0] + ': https://images.unsplash.com/photo-' + match[1] + '?auto=format&fit=crop&w=800&q=80');
    } else {
      console.log(c.split(' ')[0] + ': not found');
    }
  }
})();
