#!/usr/bin/env sh
# Builds the static app into docs/ (served by GitHub Pages). Needs esbuild and react/react-dom.
set -e
rm -rf docs && mkdir -p docs
npx esbuild src/main.jsx --bundle --minify --format=esm --jsx=automatic --outdir=docs --entry-names=app --define:process.env.NODE_ENV='"production"'
cp public/* docs/
