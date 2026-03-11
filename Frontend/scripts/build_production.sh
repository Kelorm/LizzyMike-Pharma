#!/bin/bash

# Production build script for Pharmasys Frontend
set -e

echo "Building Pharmasys Frontend for Production..."

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Run tests
echo "Running tests..."
npm run test:ci

# Build for production
echo "Building for production..."
npm run build:prod

# Analyze bundle size
echo "Analyzing bundle size..."
npm run analyze

echo "Production build completed!"
echo "Build files are in the 'build' directory"

