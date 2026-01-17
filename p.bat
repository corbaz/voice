@echo off
cls

:: Clean and recreate dist directory
if exist "dist" rmdir /s /q "dist"
mkdir "dist"

:: Copy index.html to dist/index.html
copy /Y "index.html" "dist\index.html"

:: Copy js folder to dist/js
xcopy "js" "dist\js" /E /I /Y

:: Copy css folder to dist/css
if exist "css" xcopy "css" "dist\css" /E /I /Y

:: Copy favicon.svg to dist/favicon.svg
if exist "favicon.svg" copy /Y "favicon.svg" "dist\favicon.svg"

:: Run surge
call surge dist --domain voz-ia.surge.sh

echo.
echo Deployed successfully!
echo Visit: https://voz-ia.surge.sh