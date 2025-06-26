#!/usr/bin/env bash

# Firebase Cleanup Script
# Kills any running Firebase emulator processes and clears ports

echo "🧹 Cleaning up Firebase emulator processes..."

# Kill Firebase CLI processes (be specific to avoid killing test runners)
echo "Killing Firebase CLI processes..."
pkill -f "firebase emulators" || true
pkill -f "firebase serve" || true
pkill -f "firebase-tools" || true

# Kill Java processes (Firestore and other emulators)
echo "Killing Firebase emulator Java processes..."
pkill -f "java.*firestore" || true
pkill -f "java.*firebase" || true
pkill -f "java.*cloud-firestore-emulator" || true

# Skip killing Node.js processes to avoid terminating test runners
# Node.js processes will be cleaned up by port-based cleanup below

# Kill processes on Firebase emulator ports
echo "Clearing Firebase emulator ports..."
lsof -ti:9099 | xargs kill -9 2>/dev/null || true  # Firebase Auth emulator
lsof -ti:8080 | xargs kill -9 2>/dev/null || true  # Firestore emulator  
lsof -ti:9199 | xargs kill -9 2>/dev/null || true  # Database emulator
lsof -ti:5001 | xargs kill -9 2>/dev/null || true  # Functions emulator
lsof -ti:4000 | xargs kill -9 2>/dev/null || true  # Emulator UI
lsof -ti:9000 | xargs kill -9 2>/dev/null || true  # Storage emulator
lsof -ti:8085 | xargs kill -9 2>/dev/null || true  # Pub/Sub emulator

# Clear any additional common development ports that might conflict
echo "Clearing additional development ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # Common React dev server
lsof -ti:5173 | xargs kill -9 2>/dev/null || true  # Vite dev server
lsof -ti:3001 | xargs kill -9 2>/dev/null || true  # Alternative React port

# Wait for processes to fully terminate
echo "Waiting for processes to terminate..."
sleep 3

# Verify cleanup
echo "Verifying cleanup..."
REMAINING_FIREBASE=$(pgrep -f "firebase" | wc -l)
REMAINING_JAVA=$(pgrep -f "java.*firebase" | wc -l)

if [ "$REMAINING_FIREBASE" -eq 0 ] && [ "$REMAINING_JAVA" -eq 0 ]; then
    echo "✅ Firebase cleanup completed successfully!"
else
    echo "⚠️  Some Firebase processes may still be running:"
    pgrep -f "firebase" || true
    pgrep -f "java.*firebase" || true
fi

echo "🎯 Ready for fresh Firebase emulator startup!" 