# Web NDS development

Read README.md for structure and publishing. This directory is the primary source and an independent Git repository. GitHub Pages is the only deployment target: https://suren123.github.io/web-nds/. Push to main on https://github.com/suren123/web-nds.git; .github/workflows/pages.yml tests and deploys dist/. Do not use other hosting providers or deployment mirrors.

Application sources are buildless files in dist/. Keep index.html and update.html identical and update the Service Worker asset list with any new runtime module. Preserve existing browser game/save storage during UI migrations. Do not add ROMs, user saves or credentials to Git. Run npm test for changes to input, layout migration, editing or offline behavior.
