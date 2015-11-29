DISTRO_ID=`lsb_release -i | cut -f2`

<<<<<<< HEAD
.PHONY: check tags

tags:
	@ctags -R --languages=JavaScript \
		--exclude=node_modules \
		--exclude=public/javascripts/dist \
		--exclude=public/javascripts/vendor \
		--exclude=spec/helpers \
		-f .tags

check:
=======
help:
	@echo "Utility used while development"
	@echo
	@echo "Targets:"
	@echo "    check: run tests and check code style"
	@echo "    run: run server"

.PHONY: test
test:
>>>>>>> c2e192cba78f1c13193ae1bacf7d24e282eeee8c
	@echo "Running tests"
	@echo
	@grunt test

.PHONY: lint
lint:
	@if [ "`which nodelint &> /dev/null && echo 0 || echo 1`" != "0" ]; then \
		echo "Cannot find command: nodeline"; \
		echo ; \
		exit 1; \
	fi
	@echo "Checking code styles"
	@echo
	@sh ./scripts/lintcheck

.PHONY: check
check: test lint

.PHONY: run
run:
	@if [ ! -e settings.json ]; then \
		cp settings.json.example settings.json; \
		echo "settings.json is just copied from an example file. You need to configure it to meet your requirement."; \
	fi
	@case "$(DISTRO_ID)" in \
		Fedora) \
			if [ x"`systemctl is-active mongod.service`" != "xactive" ]; then \
				sudo systemctl start mongod.service; \
			fi; \
			if [ x"`systemctl is-active redis.service`" != "xactive" ]; then \
				sudo systemctl start redis.service; \
			fi; \
			;; \
		*) \
			echo "You have to start mongodb and redis manually."; \
	esac
	@node app.js
