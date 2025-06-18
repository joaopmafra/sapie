#!/bin/bash

# Generate API client for web package
# This script fetches the OpenAPI spec from the running API server and generates
# TypeScript client code using the OpenAPI generator

set -e

echo "🚀 Generating API client for web package..."

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
OPENAPI_SPEC_URL="${API_BASE_URL}/api/docs-json"
TEMP_SPEC_FILE="temp-openapi-spec.json"

# Get the absolute path to handle different execution contexts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/packages/web/src/lib/api-client"

# Clean up any previous generated files
if [ -d "$OUTPUT_DIR" ]; then
    echo "📁 Cleaning existing API client directory..."
    rm -rf "$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Download OpenAPI specification
echo "📥 Downloading OpenAPI specification from $OPENAPI_SPEC_URL..."
cd "$PROJECT_ROOT"
curl -s "$OPENAPI_SPEC_URL" -o "$TEMP_SPEC_FILE" || {
    echo "❌ Failed to download OpenAPI specification. Make sure the API server is running at $API_BASE_URL"
    echo "   You can start the API server with: cd packages/api && pnpm dev"
    exit 1
}

# Generate TypeScript client
echo "⚙️ Generating TypeScript client..."

WEB_DIR="$PROJECT_ROOT/packages/web"
SPEC_FILE_PATH="$PROJECT_ROOT/$TEMP_SPEC_FILE"

cd "$WEB_DIR"
npx @openapitools/openapi-generator-cli generate \
    -i "$SPEC_FILE_PATH" \
    -g typescript-axios \
    -o "src/lib/api-client" \
    --additional-properties=npmName=api-client,supportsES6=true,withInterfaces=true,useSingleRequestParameter=true

# Clean up temporary spec file
cd "$PROJECT_ROOT"
rm -f "$TEMP_SPEC_FILE"

# Create index file for easier imports
echo "📝 Creating index file for easier imports..."
cat > "$OUTPUT_DIR/index.ts" << EOF
// Re-export everything from the generated API client
export * from './api';
export * from './base';
export * from './common';
export * from './configuration';

// Create a default configuration
import { Configuration } from './configuration';

export const createApiConfiguration = (basePath?: string) => {
  return new Configuration({
    basePath: basePath || '',
  });
};
EOF

echo "✅ API client generated successfully in $OUTPUT_DIR"
echo "📚 You can now import the client in your React components like this:"
echo "   import { DefaultApi, createApiConfiguration } from './lib/api-client';"
echo ""
echo "💡 Remember to regenerate the client after making API changes!"
