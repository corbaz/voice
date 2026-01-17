clear

# Clean and recreate dist directory
if (Test-Path -Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
}
New-Item -ItemType Directory -Path "dist" | Out-Null

# Copy index.html to dist/index.html
Copy-Item -Path "index.html" -Destination "dist/index.html" -Force

# Copy js folder to dist/js
Copy-Item -Path "js" -Destination "dist/js" -Recurse -Force

# Copy css folder to dist/css
if (Test-Path "css") {
    Copy-Item -Path "css" -Destination "dist/css" -Recurse -Force
}

# Copy favicon.svg to dist/favicon.svg
if (Test-Path "favicon.svg") {
    Copy-Item -Path "favicon.svg" -Destination "dist/favicon.svg" -Force
}

# Run surge
surge dist --domain voz-ia.surge.sh

Write-Host "Deployed successfully!"
Write-Host "Visit: https://voz-ia.surge.sh" -ForegroundColor Green