server:
	python -m SimpleHTTPServer 4000

# This only works on Rdio's internal network, you'll need to VPN in to deploy
deploy:
	rsync -avz -r --stats --progress -e "ssh bastion ssh srv-110-06" * :/srv/apache/algorithm
