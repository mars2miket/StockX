# 1. Start the Backend in a separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path 'C:\Devs\StockApp\StockX\backend'; node server.js"
# results below
# ◇ injected env (2) from .env // tip: ⌘ suppress logs { quiet: true }
# Finnhub key loaded: yes
# Backend running on http://localhost:3001

# 2. Start the Python OBI/OFI engine in a separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path 'C:\Devs\StockApp\StockX\signals'; & '.\venv\Scripts\Activate.ps1'; python data_handler.py"
# results below
# Python OBI/OFI engine listening on ws://localhost:8765

# 3. Open the browser first so it isn't blocked
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"

Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path 'C:\Devs\StockApp\StockX\signals'; python getgainers.py"

# 4. Keep this current window for the Frontend (This blocks everything below it)
Set-Location -Path "C:\devs\stockapp\StockX\frontend"
npm run dev




