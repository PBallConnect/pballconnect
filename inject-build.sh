#!/bin/bash
HASH=$(git rev-parse --short HEAD)
sed -i -E "s#(pickleball-registry/commit/)(XXXXXXX|[0-9a-f]{7})#\1${HASH}#" index.html
sed -i -E "s#(text-decoration:none;\">)(XXXXXXX|[0-9a-f]{7})(</a>)#\1${HASH}\3#" index.html
echo "Build badge set to: $HASH"
