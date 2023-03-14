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
$ FIL_WALLET_ADDRESS=f1... station
```

## Configuration

- `$XDG_STATE_HOME` Station stores logs and module state in
`$XDG_STATE_HOME/filecoin-station`. Defaults to `~/.local/state`.

## Commands

### `$ station`

Start Station.

Configuration:

- `$FIL_WALLET_ADDRESS` Filecoin wallet address (required). If you just want
to give `core` a quick spin, you can use the address
`f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za`. Please note that any earnings
sent there will be lost.

### `$ station metrics`

Get Station metrics.

```bash
$ station metrics
{
	"totalJobsCompleted": 123,
	"totalEarnings": "0"
}

$ station metrics --follow
{
	"totalJobsCompleted": 123,
	"totalEarnings": "0"
}
...
```

### `$ station activity`

Get Station activity logs.

Get all activity:

```bash
$ station activity
[3/14/2023, 10:23:14 AM] Saturn Node is online and connected to 1 peers
[3/14/2023, 10:23:18 AM] Saturn Node is online and connected to 9 peers
```

Follow activity:

```bash
$ station activity --follow
[3/14/2023, 10:23:14 AM] Saturn Node is online and connected to 1 peers
[3/14/2023, 10:23:18 AM] Saturn Node is online and connected to 9 peers
...
```

### `$ station logs <module>`

Get Station logs.

Get all logs:

```bash
$ station logs
[3/14/2023, 5:15:26 PM] [saturn-L2-node] INFO: Saturn Node is online and connected to 9 peers
[3/14/2023, 5:15:26 PM] [saturn-L2-node] ERROR: Saturn Node is not able to connect to the network
```

Get specific module logs:

```bash
$ station logs saturn-l2-node
[3/14/2023, 5:15:26 PM] INFO: Saturn Node is online and connected to 9 peers
[3/14/2023, 5:15:26 PM] ERROR: Saturn Node is not able to connect to the network
```

Follow logs:

```bash
$ station logs --follow
[3/14/2023, 5:15:26 PM] [saturn-L2-node] INFO: Saturn Node is online and connected to 9 peers
[3/14/2023, 5:15:26 PM] [saturn-L2-node] ERROR: Saturn Node is not able to connect to the network
...
```

### `$ station --help`

Show help.

```bash
$ station --help
Usage: station <command> [options]

Commands:
  station                   Start Station                              [default]
  station    metrics        Show metrics
  station    activity       Show activity log
  station    logs [module]  Show module logs

Options:
  -v, --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
```

### `$ station --version`

Show version number.

```bash
$ station --version
@filecoin-station/core: 1.0.1
```

## Docker

Deploy Station with [Docker](https://www.docker.com/). Please replace
`FIL_WALLET_ADDRESS`.

```bash
$ docker run \
	--name station \
	--detach \
	--env FIL_WALLET_ADDRESS=f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za \
	ghcr.io/filecoin-station/core
```

Inspect logs:

```bash
$ docker exec station ./bin/station.js logs
```

## Deployment

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

## Disclaimer

[Sentry](https://sentry.io) is used for error tracking.
[InfluxDB](https://www.influxdata.com/) is used for stats.

## Development

Update modules:

```bash
$ ./scripts/update-modules.js
```

Publish a new version:

```bash
$ npm run release
```
