import requests
import json

payload = [{
    "amount": -25.5,
    "description": "test",
    "category": "Food",
    "type": "expense",
    "createdAt": "2026-09-10",
    "accountName": "Cash"
}]

try:
    response = requests.post("http://127.0.0.1:5000/save-expenses", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
