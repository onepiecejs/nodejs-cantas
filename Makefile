
check:
	@echo "Running tests"
	@echo
	@grunt test
	@echo
	@echo "Checking code styles"
	@echo
	@sh ./scripts/lintcheck
