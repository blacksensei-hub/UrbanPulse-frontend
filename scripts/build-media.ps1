# Builds the WebP versions of public/media/*.jpg that src/utils/image.js
# points at: name.webp (full size) and name-800.webp (800px wide, for phones).
# Re-run after adding or replacing a photo in public/media. Needs ffmpeg.
#   powershell -File scripts/build-media.ps1
$ErrorActionPreference = 'Stop'
$media = Join-Path $PSScriptRoot '..\public\media'
Get-ChildItem $media -Filter *.jpg | ForEach-Object {
  $base = Join-Path $media $_.BaseName
  ffmpeg -y -v error -i $_.FullName -c:v libwebp -quality 72 -compression_level 6 "$base.webp"
  ffmpeg -y -v error -i $_.FullName -vf "scale='min(800,iw)':-2:flags=lanczos" -c:v libwebp -quality 72 -compression_level 6 "$base-800.webp"
  '{0,-20} {1,5:N0} KB -> {2,4:N0} KB full, {3,4:N0} KB 800w' -f $_.Name, ($_.Length/1KB), ((Get-Item "$base.webp").Length/1KB), ((Get-Item "$base-800.webp").Length/1KB)
}
