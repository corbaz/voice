@echo off
cls
echo Deploying to GitHub Pages...

:: Get remote URL (this is a bit hacky in batch, assuming user knows)
:: We will just run the commands assuming origin is set in the parent or we just init and push if we knew the URL.
:: Better to rely on the user having git configured or use the PS1 script.
:: But for consistency, let's try to grab it or just use the PS1 logic wrapped.

powershell -ExecutionPolicy Bypass -File "gh.ps1"
if %errorlevel% neq 0 pause
