# Web NDS development

Read README.md for structure and publishing. This directory is the primary source and an independent Git repository. The existing /workspace/sites/court-touch-lab checkout is a deployment mirror with a separate history. Do not force-push or replace that history.

Application sources are buildless files in dist/. Keep index.html and update.html identical and update the Service Worker asset list with any new runtime module. Preserve existing browser game/save storage during UI migrations. Do not add ROMs, user saves or credentials to Git. Run npm test for changes to input, layout migration, editing or offline behavior.
