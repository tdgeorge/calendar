#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import json
from urllib.parse import urlparse, parse_qs

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle API config endpoint
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            config = {
                'clientId': os.environ.get('GOOGLE_CLIENT_ID', ''),
                'apiKey': os.environ.get('GOOGLE_API_KEY', ''),
                'status': 'ok'
            }
            
            self.wfile.write(json.dumps(config).encode())
            return
        
        # Serve static files normally
        super().do_GET()

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    print(f"Starting server on port {port}")
    print("Set environment variables:")
    print("  GOOGLE_CLIENT_ID - Your Google OAuth Client ID")
    print("  GOOGLE_API_KEY - Your Google API Key")
    print(f"  Current CLIENT_ID: {'Set' if os.environ.get('GOOGLE_CLIENT_ID') else 'Not set'}")
    print(f"  Current API_KEY: {'Set' if os.environ.get('GOOGLE_API_KEY') else 'Not set'}")
    print(f"\nServer running at: http://localhost:{port}")
    print("API config endpoint: http://localhost:{port}/api/config")
    
    with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()