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

```bash
$ tail -f $XDG_STATE_HOME/filecoin-station/logs/modules/*.log
$ tail -f $XDG_STATE_HOME/filecoin-station/logs/metrics.log
```

## Development

Update modules:

```bash
$ ./scripts/update-modules.js
```

Publish a new version:

```bash
$ npm version <VERSION>
$ npm publish --access public
```