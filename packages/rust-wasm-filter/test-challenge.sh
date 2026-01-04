#!/bin/bash

echo "Testing Redis-based challenge validation..."

# Test 1: Valid challenge
echo -e "\n1. Testing VALID challenge (id=1, answer=1):"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  -H "x-challenge-id: 1" \
  -H "x-challenge-answer: 1" \
  http://localhost:8091/users/me

# Test 2: Invalid challenge  
echo -e "\n2. Testing INVALID challenge (id=1, answer=wrong):"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  -H "x-challenge-id: 1" \
  -H "x-challenge-answer: wrong" \
  http://localhost:8091/users/me

# Test 3: Missing challenge headers
echo -e "\n3. Testing MISSING challenge headers:"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  http://localhost:8091/users/me

echo -e "\nDone!"