<h1 align="center">
	<br>
	 :artificial_satellite:
	<br>
	<br>
	Checker
	<br>
	<br>
	<br>
</h1>

> Checker is a node implementation for the
> [Checker Network](https://checker.network), suitable for running on all kinds
> of servers..

[![CI](https://github.com/CheckerNetwork/checker/actions/workflows/ci.yml/badge.svg)](https://github.com/CheckerNetwork/checker/actions/workflows/ci.yml)

## Deployment

Checker supports different deployment options:

- [Docker](#docker)
- [Manual Deployment (Ubuntu)](#manual-deployment-ubuntu)

## Installation

> **Note**: Checker requires Node.js, we recommend using the latest LTS version.
> You can install Node.js using your favorite package manager or get the
> official installer from [Node.js downloads](https://nodejs.org/en/download/).

With Node.js installed, run `npm` to install Checker.

```bash
$ npm install -g @checkernetwork/checker
```

## Usage

```bash
$ FIL_WALLET_ADDRESS=... PASSPHRASE=... checker
```

## Common Configuration

Checker is configured using environment variables (see
[The Twelve-Factor App](https://12factor.net/config)).

The following configuration options are shared by all Checker commands:

- `$CACHE_ROOT` _(string; optional)_: Checker stores temporary files (e.g.
  cached data) in this directory. Defaults to
  - Linux: `${XDG_CACHE_HOME:-~/.cache}/checker-network-checker`
  - macOS: `~/Library/Caches/network.checker.checker`
  - Windows: `%TEMP%/Filecoin Checker`
- `$STATE_ROOT` _(string; optional)_: Checker stores logs and module state in
  this directory. Defaults to

  - Linux: `${XDG_STATE_HOME:-~/.local/state}/checker-network-checker`
  - macOS: `~/Library/Application Support/network.checker.checker`
  - Windows: `%LOCALAPPDATA%/Filecoin Checker`

  **IMPORTANT:** The`$STATE_ROOT` directory must be local to the computer
  running the Checker. This directory must not be shared with other computers
  operated by the user, e.g. via Windows Domain profile or cloud storage like
  iCloud Drive, Dropbox and OneDrive.

## Commands

### `$ checker`

Start a new Checker process. The Checker will run in foreground and can be
terminated by pressing Ctrl+C.

This command has the following additional configuration in addition to common
the configuration options described in
[Common Configuration](#common-configuration):

- `FIL_WALLET_ADDRESS` _(string; required)_: Address of the Filecoin wallet that
  will receive rewards. The value must be a mainnet address starting with
  `f410`, `0x`.

  `f1` addresses currently are not supported. Rewards for Checker operators are
  administered by a FEVM smart contract. It is currently technically complex to
  make payments to f1 addresses.

  If you just want to give `core` a quick spin, you can use the address
  `0x000000000000000000000000000000000000dEaD`. Please note that any earnings
  sent there will be lost.

- `PASSPHRASE` _(string; optional)_: a passphrase to protect the Checker
  instance private key stored in a file inside the `STATE_ROOT` directory.

- `MODULE_FILTER` _(string; optional)_: Run only the Zinnia module with the
  given name. Eg:
  - `MODULE_FILTER=spark`

This command outputs metrics and activity events:

```bash
$ checker
{
  "totalJobsCompleted": 161,
  "rewardsScheduledForAddress": "0.041033208757289921"
}
[4/19/2023, 9:26:54 PM] INFO  Saturn Node will try to connect to the Saturn Orchestrator...
[4/19/2023, 9:26:54 PM] INFO  Saturn Node was able to connect to the Orchestrator and will now start connecting to the Saturn network...
...
```

```bash
$ checker --json
{"type":"jobs-completed","total":161}
{"type":"activity:info","module":"Saturn","message":"Saturn Node will try to connect to the Saturn Orchestrator..."}
{"type":"activity:info","module":"Saturn","message":"Saturn Node was able to connect to the Orchestrator and will now start connecting to the Saturn network..."}
...
```

For the JSON output, the following event types exist:

- `jobs-completed`
  - `total`
- `activity:info`
  - `module`
  - `message`
- `activity:error`
  - `module`
  - `message`

Set the flag `--experimental` to run modules not yet considered safe for
production use. _Run this at your own risk!_

No modules currently in experimental mode.

### `$ checker --help`

Show help.

```bash
$ checker --help
Usage: checker [options]

Options:
  -j, --json                      Output JSON                          [boolean]
      --experimental              Also run experimental modules        [boolean]
      --recreateCheckerIdOnError  Recreate Checker ID if it is corrupted
                                                                       [boolean]
  -v, --version                   Show version number                  [boolean]
  -h, --help                      Show help                            [boolean]
```

### `$ checker --version`

Show version number.

```bash
$ checker --version
@checkernetwork/checker: 1.0.1
```

## Docker

Deploy Checker with [Docker](https://www.docker.com/). Please replace
`FIL_WALLET_ADDRESS` and ensure the passed `state` folder is persisted across
machine restarts.

```bash
$ docker run \
	--name checker \
	--detach \
	--env FIL_WALLET_ADDRESS=0x000000000000000000000000000000000000dEaD \
        -v ./state:/home/node/.local/state/
	ghcr.io/CheckerNetwork/checker
```

## Manual Deployment (Ubuntu)

On a fresh [Ubuntu](https://ubuntu.com/) machine:

```bash
# Install node.js
$ curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - &&\
sudo apt-get install -y nodejs

# Install core
$ npm install -g @checkernetwork/checker

# Create systemd service
# Don't forget to replace FIL_WALLET_ADDRESS and User
$ sudo tee /etc/systemd/system/checker.service > /dev/null <<EOF
[Unit]
Description=Filecoin Checker
Documentation=https://github.com/CheckerNetwork/checker
After=network.target

[Service]
Environment=FIL_WALLET_ADDRESS=XYZ
Type=simple
User=XYZ
ExecStart=/usr/bin/checker
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
$ sudo systemctl daemon-reload
$ sudo systemctl start checker
$ sudo systemctl status checker

# Read logs
$ journalctl -u checker.service
```

## Disclaimer

The CLI uses [Sentry](https://sentry.io) for error tracking.
[InfluxDB](https://www.influxdata.com/) is used for stats.

## Development

Publish a new version:

```bash
$ npm run release
```
