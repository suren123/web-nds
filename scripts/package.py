from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
dist=root/'dist'
with zipfile.ZipFile(dist/'court-app-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(dist.iterdir()):
  if p.suffix in ['.js','.mjs','.html','.css','.webmanifest','.png']:z.write(p,p.name)
 z.write(root/'LICENSE','LICENSE.txt')
 z.write(dist/'core/NOTICE.html','core/NOTICE.html')
 z.write(root/'README.md','README.md')
