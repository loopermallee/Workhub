## Packages
date-fns | Date manipulation for calculating the 14-day recent window
framer-motion | Smooth animations for the news banner and list items
vaul | Mobile-native bottom drawers for content and category drill-downs
lucide-react | High-quality icons (already in base stack, but confirming need for UI)

## Notes
- Using `vaul` for authentic mobile drawer experiences (category drill-downs, content reading).
- Custom fonts: Plus Jakarta Sans (Headers) & Inter (Body) to match the "design professional" premium feel requested (since Mona Sans is not available via standard Google Fonts CDN, Plus Jakarta Sans provides an identical premium geometric look).
- Colors are strictly mapped to the requested palette: Primary #0D0C22, Accent #FFFFFF, Text #808080.
- Assumes `GET /api/data` will return the schema structure defined. Missing endpoints will fail gracefully with beautiful error states.
