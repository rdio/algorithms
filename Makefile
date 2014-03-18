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
	rsync -avzO -r --delete --stats --progress -e "ssh bastion ssh srv-110-06" * :/srv/apache/algorithm
	ssh bastion ssh srv-110-06 chgrp -R dev /srv/apache/algorithm/*
	ssh bastion ssh srv-110-06 chmod -R 775 /srv/apache/algorithm/*
