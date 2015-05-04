
.PHONY: check tags

tags:
	@ctags -R --languages=JavaScript \
		--exclude=node_modules \
		--exclude=public/javascripts/dist \
		--exclude=public/javascripts/vendor \
		--exclude=spec/helpers \
		-f .tags

check:
	@echo "Running tests"
	@echo
	@grunt test
	@echo
	@echo "Checking code styles"
	@echo
	@sh ./scripts/lintcheck
