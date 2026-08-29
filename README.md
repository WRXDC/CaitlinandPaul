# Caitlin & Paul — Wedding Site

Static site for our wedding, October 16, 2027 in Mexico City.

## Pages

- `index.html` — home
- `our-story.html` — our story
- `the-wedding.html` — ceremony/weekend schedule, dress code, transportation
- `registry.html` — registry (coming soon)
- `travel.html` — travel info
- `stay.html` — neighborhoods and hotels
- `explore-cdmx.html` — things to do in Mexico City
- `faq.html` — FAQ
- `rsvp.html` — RSVP form

## Editing content

Most editable text (dates, venue, schedule, hotels, FAQ answers, etc.) lives in
`assets/js/content.js` — update it there rather than in the HTML. Search for
`TBD` to find placeholders that still need real info.

## Running locally

No build step — just serve the folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
