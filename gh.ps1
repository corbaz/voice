# Deploy to GitHub Pages
# ----------------------

# Get Remote URL
$remoteUrl = git config --get remote.origin.url
if (-not $remoteUrl) {
    Write-Error "No remote origin found. Please configure a git remote."
    exit 1
}

Write-Host "Deploying to GitHub Pages ($remoteUrl)..." -ForegroundColor Cyan

# Clean and recreate dist directory
if (Test-Path -Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
}
New-Item -ItemType Directory -Path "dist" | Out-Null

# Copy files
Write-Host "Copying files..."
Copy-Item -Path "index.html" -Destination "dist/index.html" -Force
Copy-Item -Path "js" -Destination "dist/js" -Recurse -Force
if (Test-Path "css") { Copy-Item -Path "css" -Destination "dist/css" -Recurse -Force }
if (Test-Path "favicon.svg") { Copy-Item -Path "favicon.svg" -Destination "dist/favicon.svg" -Force }

# Deploy
Write-Host "Pushing to gh-pages branch..."
Set-Location dist
git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy to GitHub Pages"
git remote add origin $remoteUrl
git push -f origin gh-pages
Set-Location ..

Write-Host "Deployed successfully!" -ForegroundColor Green
Write-Host "Your site should be live at: https://corbaz.github.io/voice/" -ForegroundColor Green
