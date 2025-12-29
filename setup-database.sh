#!/bin/bash

# Database Setup Script for TuChonga Admin
# This script helps set up PostgreSQL for local development

echo "🚀 TuChonga Database Setup"
echo "=========================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "To install PostgreSQL on macOS:"
    echo "  brew install postgresql@15"
    echo "  brew services start postgresql@15"
    echo ""
    echo "Or use Railway PostgreSQL (cloud):"
    echo "  1. Sign up at https://railway.app"
    echo "  2. Create project → Add PostgreSQL"
    echo "  3. Copy DATABASE_URL to .env file"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw tuchonga; then
    echo "✅ Database 'tuchonga' already exists"
else
    echo "📦 Creating database 'tuchonga'..."
    createdb tuchonga
    if [ $? -eq 0 ]; then
        echo "✅ Database 'tuchonga' created successfully"
    else
        echo "❌ Failed to create database"
        echo "Try manually: createdb tuchonga"
        exit 1
    fi
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env file with your DATABASE_URL"
echo "  2. Run: npx prisma migrate dev --name init"
echo "  3. Run: npx prisma studio (to view database)"
echo ""

