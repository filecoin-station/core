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

- `$FIL_WALLET_ADDRESS` Filecoin wallet address (required)
- `$XDG_STATE_HOME` Station stores logs and module state in
`$XDG_STATE_HOME/filecoin-station`. Defaults to `~/.local/state`.

## Files

Log files are currently used to read `core` state.

### Metrics

```bash
$ tail -f $XDG_STATE_HOME/filecoin-station/logs/metrics.log
2023-02-16T22:59:47.385+0100 {"totalJobsCompleted":123}
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

## Development

Update modules:

```bash
$ ./scripts/update-modules.js
```

Publish a new version:

```bash
$ npm run release
```