#!/bin/bash

echo "🧪 Testing Firebase Status Endpoint"
echo ""

# Test local
echo "📍 Testing Local (http://localhost:3001/api/auth/firebase-status)"
echo "----------------------------------------"
curl -s http://localhost:3001/api/auth/firebase-status | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/auth/firebase-status
echo ""
echo ""

# Test production
echo "📍 Testing Production (https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status)"
echo "----------------------------------------"
curl -s https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status | jq '.' 2>/dev/null || curl -s https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status
echo ""

