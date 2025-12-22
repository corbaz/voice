@echo off
cls

:: Create dist directory if it doesn't exist
if not exist "dist" mkdir "dist"

:: Copy index.html to dist/index.html
copy /Y "index.html" "dist\index.html"

:: Run surge
call surge dist --domain voz-ia.surge.sh

echo.
echo Deployed successfully!
echo Visit: https://voz-ia.surge.sh
