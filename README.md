<h1 align="center">
	<br>
	 :artificial_satellite:
	<br>
	<br>
	Station Core
	<br>
	<br>
	<br>
</h1>

> Station Core is a headless version of Filecoin Station suitable for running on
> all kinds of servers.

[![CI](https://github.com/filecoin-station/core/actions/workflows/ci.yml/badge.svg)](https://github.com/filecoin-station/core/actions/workflows/ci.yml)

## Deployment

Station Core supports different deployment options:

- [Docker](#docker)
- [Manual Deployment (Ubuntu)](#manual-deployment-ubuntu)

## Installation

> **Note**: Station Core requires Node.js, we recommend using the latest LTS
> version. You can install Node.js using your favorite package manager or get
> the official installer from
> [Node.js downloads](https://nodejs.org/en/download/).

With Node.js installed, run `npm` to install Station Core.

```bash
$ npm install -g @filecoin-station/core
```

## Usage

```bash
$ FIL_WALLET_ADDRESS=f1... station
```

## Common Configuration

Station Core is configured using environment variables (see
[The Twelve-Factor App](https://12factor.net/config)).

The following configuration options are shared by all Station commands:

- `$XDG_STATE_HOME` _(string; optional)_: Station stores logs and module state
  in the directory `$XDG_STATE_HOME/filecoin-station`. State home defaults to
  `~/.local/state`.

## Commands

### `$ station`

Start a new Station process. The Station will run in foreground and can be
terminated by pressing Ctrl+C.

This command has the following additional configuration in addition to common
the configuration options described in
[Common Configuration](#common-configuration):

- `FIL_WALLET_ADDRESS` _(string; required)_: Address of the Filecoin wallet that
  will receive rewards. The value must be a mainnet address starting with `f1`.

  If you just want to give `core` a quick spin, you can use the address
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
[3/14/2023, 10:23:14 AM] INFO  Saturn Node is online and connected to 1 peers
[3/14/2023, 10:23:18 AM] INFO  Saturn Node is online and connected to 9 peers
```

Follow activity:

```bash
$ station activity --follow
[3/14/2023, 10:23:14 AM] INFO  Saturn Node is online and connected to 1 peers
[3/14/2023, 10:23:18 AM] INFO  Saturn Node is online and connected to 9 peers
...
```

### `$ station logs <module>`

Get combined logs from Station Core and all Station Modules:

```bash
$ station logs
[3/14/2023, 5:15:26 PM] [saturn-L2-node] INFO: Saturn Node is online and connected to 9 peers
[3/14/2023, 5:15:26 PM] [saturn-L2-node] ERROR: Saturn Node is not able to connect to the network
```

Get logs from a specific Station Module:

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

### `$ station --listen`

Open HTTP API.

Routes:

- `/` 404 (Placeholder route)

### `$ station --listen --port`

Set HTTP API port. Default: `7834`

### `$ station --help`

Show help.

```bash
$ station --help
Usage: station <command> [options]

Commands:
  station                Start Station                                 [default]
  station metrics        Show metrics
  station activity       Show activity log
  station logs [module]  Show module logs

Options:
  -l, --listen   Open HTTP API                                         [boolean]
  -p, --port     HTTP API port                          [number] [default: 7834]
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

## Manual Deployment (Ubuntu)

On a fresh [Ubuntu](https://ubuntu.com/) machine:

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
