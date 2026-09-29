#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "=== SubClean: SRT Subtitle Cleaner ==="

# Check if .venv exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# Start uvicorn server and open browser
echo "Starting SubClean server at http://127.0.0.1:8000 ..."
(sleep 2 && open "http://127.0.0.1:8000") &

python app.py
