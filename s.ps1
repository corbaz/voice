clear

# 1. Detect Local IP Address
$ipObject = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*vEthernet*" -and $_.IPAddress -like "192.*" } | Select-Object -First 1
if (!$ipObject) {
    $ipObject = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*vEthernet*" } | Select-Object -First 1
}
$localIP = $ipObject.IPAddress

if (!$localIP) {
    $localIP = "127.0.0.1"
    Write-Host "⚠️ No se pudo detectar la IP local. Usando 127.0.0.1" -ForegroundColor Yellow
} else {
    Write-Host "📍 IP Local detectada: $localIP" -ForegroundColor Cyan
}

# 2. Prepare OpenSSL Config for SAN (Subject Alternative Name)
# This is crucial for Chrome on Android to accept the certificate for an IP address
$opensslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Organization
OU = Unit
CN = $localIP

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = $localIP
DNS.1 = localhost
"@

$opensslConfig | Out-File -FilePath "cert.conf" -Encoding ASCII

# 3. Generate/Regenerate SSL Certificate
# We always regenerate to ensure the IP matches the current network
Write-Host "🔐 Generando certificado SSL optimizado para Chrome/Android..." -ForegroundColor Yellow

try {
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -config cert.conf
    Write-Host "✅ Certificado generado con SAN para IP: $localIP" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al generar certificado con OpenSSL." -ForegroundColor Red
    Write-Host "Asegúrate de tener Git Bash o OpenSSL instalado y en el PATH."
    exit
}

# 4. Start Python Server
Write-Host ""
Write-Host "🚀 Iniciando servidor web seguro..." -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------"
Write-Host "📱 EN TU MÓVIL (Chrome/Edge/Brave/Firefox):" -ForegroundColor Yellow
Write-Host "   🔗 URL: https://$($localIP):8000" -ForegroundColor White
Write-Host "   (¡Asegúrate de escribir 'https://' al principio!)" -ForegroundColor Red
Write-Host ""
Write-Host "   🛑 Si ves una advertencia de seguridad:" -ForegroundColor Gray
Write-Host "      1. Toca 'Configuración avanzada' o 'Más información'"
Write-Host "      2. Toca 'Continuar a $localIP (no seguro)'"
Write-Host "----------------------------------------------------------------"

# Pass the IP to python script as an environment variable or argument if needed, 
# but binding to 0.0.0.0 covers it.
python server.py