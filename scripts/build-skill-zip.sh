#!/bin/sh
# Build the skill upload for claude.ai (Customize or Settings, Skills, upload a ZIP):
# dist/kartvelians-knowledge.zip containing kartvelians-knowledge/SKILL.md.
# The site serves a copy at https://kartvelians.com/ai/kartvelians-knowledge.zip
# (kartvelians-web/public/ai/); copy it there after any change to the skill.
set -eu
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
(cd plugin/skills && zip -qrX ../../dist/kartvelians-knowledge.zip kartvelians-knowledge -x '*.DS_Store')
unzip -l dist/kartvelians-knowledge.zip
