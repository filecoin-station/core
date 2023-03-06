<h1 align="center">
	<br>
	 :artificial_satellite: 
	<br>
	<br>
	core
	<br>
	<br>
	<br>
</h1>

> Repo for Filecoin Station Core

[![CI](https://github.com/filecoin-station/core/actions/workflows/ci.yml/badge.svg)](https://github.com/filecoin-station/core/actions/workflows/ci.yml)

## Installation

```bash
$ npm install -g @filecoin-station/core
```

## Usage

```bash
$ station
```

## Configuration

- `$FIL_WALLET_ADDRESS` Filecoin wallet address (required). If you just want
to give `core` a quick spin, you can use the address
`f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za`. Please note that any earnings
sent there will be lost.
- `$XDG_STATE_HOME` Station stores logs and module state in
`$XDG_STATE_HOME/filecoin-station`. Defaults to `~/.local/state`.

### Metrics

```bash
$ station metrics
{
	"totalJobsCompleted": 123
}

$ station metrics --follow
{
	"totalJobsCompleted": 123
}
...
```

### Logs

```bash
$ tail -f $XDG_STATE_HOME/filecoin-station/logs/modules/*.log
==> $XDG_STATE_HOME/filecoin-station/logs/modules/saturn-l2-node.log <==
2023-02-16T22:59:47.385+0100 INFO: Saturn Node is online and connected to 9 peers
2023-02-16T22:59:47.385+0100 ERROR: Saturn Node is not able to connect to the network
...
```

### Deployment

On a fresh [ubuntu](https://ubuntu.com/) machine:

```bash
# Install node.js
$ curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs

# Install core
$ npm install -g @filecoin-station/core

# Create systemd service
# Don't forget to replace FIL_WALLET_ADDRESS and User
$ sudo tee /etc/systemd/system/station.service > /dev/null <<EOF
[Unit]
Description=Filecoin Station Core
Documentation=https://github.com/filecoin-station/core
After=network.target

[Service]
Environment=FIL_WALLET_ADDRESS=XYZ
Type=simple
User=XYZ
ExecStart=/usr/bin/station
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
$ sudo systemctl daemon-reload
$ sudo systemctl start station
$ sudo systemctl status station
```

## Development

Update modules:

```bash
$ ./scripts/update-modules.js
```

Publish a new version:

```bash
$ npm run release
```