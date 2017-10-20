.PHONY: clean

dist: src/*.ts
	npm run build

clean:
	rm -rf dist

release: dist
	$(eval VERSION ?= $(shell /usr/bin/env node -e "console.log(require('./package.json').version);"))
	git checkout --orphan release-$(VERSION)
	git rm -rf assets .editorconfig .gitignore tsconfig.json tslint.json src __tests__
	rm -rf build dependencies node_modules
	git add -A
	git commit -a -m "Release $(VERSION)" --no-verify
	git push origin release-$(VERSION)