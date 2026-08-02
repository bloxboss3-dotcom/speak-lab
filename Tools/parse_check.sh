#!/usr/bin/env bash
# Syntax-checks every Swift file in the repository.
#
# This is not a substitute for building in Xcode — `swiftc -parse` does not
# resolve imports or type-check, so it cannot catch a wrong SwiftUI signature.
# What it does catch is every syntax error, on any machine with a Swift
# toolchain and no Xcode. Useful in CI on Linux, and useful before committing.
#
# Usage: Tools/parse_check.sh [path-to-swiftc]

set -uo pipefail

SWIFTC="${1:-$(command -v swiftc || echo /opt/swift/usr/bin/swiftc)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -x "$SWIFTC" ]; then
  echo "swiftc not found. Pass its path as the first argument." >&2
  exit 127
fi

failed=0
checked=0

while IFS= read -r file; do
  checked=$((checked + 1))
  if ! output=$("$SWIFTC" -parse "$file" 2>&1); then
    echo "--- $file"
    echo "$output"
    failed=$((failed + 1))
  fi
done < <(find "$ROOT/ios" "$ROOT/Tests" -name '*.swift' | sort)

echo
echo "Parsed $checked Swift files, $failed with syntax errors."
[ "$failed" -eq 0 ]
