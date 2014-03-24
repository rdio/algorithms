JSHINT=./node_modules/jshint/bin/jshint
JSHINTFLAGS=

UGLIFYJS=./node_modules/uglify-js/bin/uglifyjs
UGLIFYJSFLAGS=

LESSC=./node_modules/less/bin/lessc
LESSFLAGS=

APACHE=False
ifeq ($(APACHE), True)
	PWD := $(shell pwd)
	SERVER := httpd -d $(PWD) -e info -f $(PWD)/dev.conf -k start -DFOREGROUND
else
	SERVER := python -m SimpleHTTPServer 4000
endif

server:
	$(SERVER)

# This only works on Rdio's internal network, you'll need to VPN in to deploy
deploy:
	-rsync -avzO -r --delete --stats --progress -e "ssh bastion ssh srv-110-06" * :/srv/apache/algorithm
	-ssh bastion ssh srv-110-06 chgrp -R dev /srv/apache/algorithm/*
	-ssh bastion ssh srv-110-06 chmod -R 775 /srv/apache/algorithm/*

js_files=$(shell find Components -name '*.js')
jshint: $(js_files)
	$(JSHINT) $(JSHINTFLAGS) $?

%.min.js: %.js
	$(UGLIFYJS) $(UGLIFYJSFLAGS) $? > $@

core_js_files=$(shell find blog -name *.js)
min_core_js_files=$(core_js_files:%.js=%.min.js)
core.js: $(min_core_js_files)
	cat $^ > $@

%.css: %.less
	$(LESSC) $(LESSCFLAGS) $? > $@

core_less_files=$(shell find blog -name *.less)
core.css: $(shell find blog -name *.css) $(core_less_files:%.less=%.css)
	cat $^ > $@

prod: core.js core.css

watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) remake *.js *.css -- make prod

clean:
	rm -f core.js core.css blog/*.min.js
