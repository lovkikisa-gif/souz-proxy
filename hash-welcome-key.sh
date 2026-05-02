#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./hash-welcome-key.sh <raw-key>"
  exit 1
fi

./gradlew hashWelcomeKey -Pargs="$1"
