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

- `FIL_WALLET_ADDRESS` Filecoin wallet address (required)
- `ROOT` Module storage root directory (defaults to `~/.station/`)

## Files

```bash
$ tail -f $ROOT/logs/modules/*.log
$ tail -f $ROOT/logs/metrics.log
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