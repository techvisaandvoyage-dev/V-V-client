import urllib.request
import re

countries = ['usa landmark', 'london uk', 'canada landscape', 'dubai burj khalifa', 'japan tokyo', 'australia sydney', 'singapore marina', 'turkey istanbul', 'india taj mahal', 'paris france', 'thailand bangkok', 'indonesia bali', 'germany berlin', 'italy rome']

for c in countries:
    url = "https://unsplash.com/s/photos/" + c.replace(' ', '-')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'\"id\":\"([a-zA-Z0-9_\-]+)\",\"slug\"', html)
        if match:
            print(f"{c.split(' ')[0]}: https://images.unsplash.com/photo-{match.group(1)}?auto=format&fit=crop&w=800&q=80")
        else:
            print(f"{c.split(' ')[0]}: no match")
    except Exception as e:
        print(f"{c.split(' ')[0]}: error {e}")
