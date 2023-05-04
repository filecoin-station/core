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

- `$CACHE_ROOT`_(string; optional)_: Station stores temporary files (e.g. cached
  data) in this directory. Defaults to
  - Linux: `${XDG_CACHE_HOME:-~/.cache}/filecoin-station-core`
  - macOS: `~/Library/Caches/app.filstation.core`
  - Windows: `%TEMP%/Filecoin Station Core`
- `$STATE_ROOT`_(string; optional)_: Station stores logs and module state in
  this directory. Defaults to
  - Linux: `${XDG_STATE_HOME:-~/.local/state}/filecoin-station-core`
  - macOS: `~/Library/Application Support/app.filstation.core`
  - Windows: `%LOCALAPPDATA%/Filecoin Station Core`

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

- `$MAX_DISK_SPACE`_(number; optional)_: Maximum disk space (in bytes) to use in
  `$CACHE_ROOT` and `$STATE_ROOT` combined.

This command outputs metrics and activity events:

```bash
$ station
{
  "totalJobsCompleted": 161,
  "totalEarnings": "0"
}
[4/19/2023, 9:26:54 PM] INFO  Saturn Node will try to connect to the Saturn Orchestrator...
[4/19/2023, 9:26:54 PM] INFO  Saturn Node was able to connect to the Orchestrator and will now start connecting to the Saturn network...
...
```

```bash
$ station --json
{"type":"jobs-completed","total":161}
{"type":"activity:info","timestamp":"2023-04-19T19:27:33.000Z","module":"Saturn","message":"Saturn Node will try to connect to the Saturn Orchestrator...","id":"45b62253-ad1e-4e85-ae16-a7bcaae71dce"}
{"type":"activity:info","timestamp":"2023-04-19T19:27:33.000Z","module":"Saturn","message":"Saturn Node was able to connect to the Orchestrator and will now start connecting to the Saturn network...","id":"b0c14132-98b2-4e4d-b206-0f2f1f3a4c77"}
...
```

For the JSON output, the following event types exist:

- `jobs-completed`
  - `total`
- `activity:info`
  - `timestamp`
  - `module`
  - `message`
  - `id`
- `activity:error`
  - `timestamp`
  - `module`
  - `message`
  - `id`

Set the flag `--experimental` to run modules not yet considered safe for
production use. _Run this at your own risk!_

Modules currently in experimental mode:

- [Bacalhau](https://github.com/bacalhau-project/bacalhau)

### `$ station metrics <module>`

Get combined metrics from all Station Modules:

```bash
$ station metrics
{
	"totalJobsCompleted": 123,
	"totalEarnings": "0"
}
```

Get metrics from a specific Station Module:

```bash
$ station metrics saturn-l2-node
{
	"totalJobsCompleted": 123,
	"totalEarnings": "0"
}
```

Follow metrics:

```bash
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

```bash
$ station activity --json
[
  {
    "timestamp": "2023-04-05T11:26:41.000Z",
    "type": "info",
    "source": "Saturn",
    "message": "Saturn Node is online and connected to 1 peers",
    "id": "b6e922f2-54fb-4d5b-adcb-499391e4a09e"
  },
  {
    "timestamp": "2023-04-05T11:26:46.000Z",
    "type": "info",
    "source": "Saturn",
    "message": "Saturn Node is online and connected to 9 peers",
    "id": "ffb551a0-247f-471d-b4db-0145cc3b1614"
  }
]
```

Follow activity:

```bash
$ station activity --follow
[3/14/2023, 10:23:14 AM] INFO  Saturn Node is online and connected to 1 peers
[3/14/2023, 10:23:18 AM] INFO  Saturn Node is online and connected to 9 peers
...
```

```bash
$ station activity --follow --json
{"timestamp":"2023-04-05T11:26:41.000Z","type":"info","source":"Saturn","message":"Saturn Node is online and connected to 1 peers""id":"b6e922f2-54fb-4d5b-adcb-499391e4a09e"}
{"timestamp":"2023-04-05T11:26:46.000Z","type":"info","source":"Saturn","message":"Saturn Node is online and connected to 9 peers""id":"ffb551a0-247f-471d-b4db-0145cc3b1614"}
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

### `$ station --help`

Show help.

```bash
$ station --help
Usage: station <command> [options]

Commands:
  station                   Start Station                              [default]
  station metrics [module]  Show metrics
  station activity          Show activity log
  station logs [module]     Show module logs
  station events            Events stream

Options:
  -j, --json          Output JSON                                      [boolean]
      --experimental  Also run experimental modules                    [boolean]
  -v, --version       Show version number                              [boolean]
  -h, --help          Show help                                        [boolean]
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

## API

### `new Core({ cacheRoot?: String, stateRoot?: String }?)`

Creates a new instance of `Core`.

### `Core#logs.get(module?: String)`

Returns `Promise<String>`.

### `Core#logs.follow(module?: String)`

Returns `AsyncGenerator<String>`.

### `Core#activity.get()`

Returns `Promise<ActivityEvent[]>`.

### `Core#activity.follow({ signal?: AbortSignal, nLines = 10?: Number }?)`

Returns `AsyncGenerator<ActivityEvent>`.

### `Core#metrics.getLatest(module?: String)`

Returns `Promise<MetricsEvent>`.

### `Core#metrics.follow({ module?: String, signal?: AbortSignal }?)`

Returns `AsyncGenerator<MetricsEvent>`.

### `ActivityEvent`

```
{
  timestamp: Date
  type: ("info"|"error")
  source: String
  message: String
  id: String
}
```

### `MetricsEvent`

```
{
  totalJobsCompleted: Number
  totalEarnings: String
}
```

## Disclaimer

The CLI uses [Sentry](https://sentry.io) for error tracking.
[InfluxDB](https://www.influxdata.com/) is used for stats.

## Development

Publish a new version:

```bash
$ npm run release
```
