#!/bin/bash

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
PORT=8000

# URLs
LOCAL_URL="http://localhost:$PORT"
NETWORK_URL="http://$LOCAL_IP:$PORT"
INDEX2_URL="http://$LOCAL_IP:$PORT/index2.html"

echo "🚀 Starting server..."
echo ""
echo "📱 Access URLs:"
echo "   Local:    $LOCAL_URL"
echo "   Network:  $NETWORK_URL" 
echo "   Index2:   $INDEX2_URL"
echo ""

# Check if qrencode is available
if command -v qrencode &> /dev/null; then
    echo "📱 QR Code for Network URL:"
    qrencode -t UTF8 "$NETWORK_URL"
    echo ""
    echo "📱 QR Code for Index2:"
    qrencode -t UTF8 "$INDEX2_URL"
    echo ""
else
    echo "💡 Install qrencode for QR codes: brew install qrencode"
    echo ""
fi

echo "🛑 Press Ctrl+C to stop"
echo ""

# Start server
python3 -m http.server $PORT --bind 0.0.0.0