import sys
from pathlib import Path

# Add the project root directory to sys.path so 'backend' can be resolved
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import the Flask app from backend.server
from backend.server import app

if __name__ == "__main__":
    print("Starting Expense Tracker Full Project Server...")
    app.run(debug=True)
