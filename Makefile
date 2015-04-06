DISTRO_ID=`lsb_release -i | cut -f2`

help:
	@echo "Utility used while development"
	@echo
	@echo "Targets:"
	@echo "    check: run tests and check code style"
	@echo "    run: run server"

.PHONY: check
check:
	@echo "Running tests"
	@echo
	@grunt test
	@echo
	@echo "Checking code styles"
	@echo
	@sh ./scripts/lintcheck

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
