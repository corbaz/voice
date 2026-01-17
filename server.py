import http.server
import ssl
import socket

PORT = 8000
ADDRESS = "0.0.0.0"

print("-" * 50)
print(f"🚀 Servidor HTTPS iniciado en puerto {PORT}")
print(f"📡 Disponible en toda la red local.")
print("-" * 50)
print("IMPORTANTE PARA MÓVILES:")
print("1. Usa https:// (no http://)")
print("2. Acepta la advertencia de seguridad ('Sitio no seguro' / 'Configuración avanzada' -> 'Continuar')")
print("3. Esto es necesario para que el navegador permita usar el micrófono.")
print("-" * 50)

server_address = (ADDRESS, PORT)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

try:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()
except FileNotFoundError:
    print("\n❌ ERROR: No se encontraron los archivos de certificado (cert.pem, key.pem).")
    print("Ejecuta el script 's.ps1' para generarlos automáticamente.\n")
except KeyboardInterrupt:
    print("\n🛑 Servidor detenido.")
    httpd.server_close()