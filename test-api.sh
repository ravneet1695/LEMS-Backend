#!/bin/bash
# Test script to check /api/users endpoint

# Login and get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"s@gmail.com","password":"admin123"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Test /api/users endpoint
echo -e "\n\nTesting /api/users endpoint..."
curl -v -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5002/api/users?page=1&limit=10&sortBy=createdAt&sortOrder=desc"
