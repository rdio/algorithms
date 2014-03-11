server:
	python -m SimpleHTTPServer 4000

# This only works on Rdio's internal network, you'll need to VPN in to deploy
deploy:
	rsync -avzO -r --delete --stats --progress -e "ssh bastion ssh srv-110-06" * :/srv/apache/algorithm
	ssh bastion ssh srv-110-06 chgrp -R dev /srv/apache/algorithm/*
	ssh bastion ssh srv-110-06 chmod -R 775 /srv/apache/algorithm/*
