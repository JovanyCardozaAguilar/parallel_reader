# bible_reader_parallel

Static three-column (English | Español | Deutsch) Bible reader for GitHub Pages. No build step on the server.

- `index.html`, `style.css`, `app.js`: the reader. `data/manifest.json` + `data/<lang>/<BOOK>.json`: text, one file per book and language (loaded on demand).
- Regenerate the data after any text change: `cd Bible_translations_books/Unified && python3 -I scripts/build_website.py` (reads the unified JSONs, never modifies them).
- Test locally: `python3 -m http.server` in this folder, open http://localhost:8000 (opening index.html via file:// will not work because fetch() is blocked).
- Deep links: `#JHN.3`, `#JHN.3.16`, `#2ES.14.48E`.
- Private, non-commercial use; see the page footer and `Unified/README.md` for sources and licences.
