#!/bin/bash

set -ex

commit=$(git rev-parse HEAD)
commit=${commit:0:7}
rm -rf dist
git clone --depth=1 -b gh-pages "git@github.com:shicks/multitimer" dist
npm run gulp
cd dist
git commit -am "update gh-pages for $commit"
git push origin gh-pages
