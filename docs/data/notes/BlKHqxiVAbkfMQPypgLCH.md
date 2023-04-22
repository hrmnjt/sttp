

## Bootstraping on local for the first time

### Installing

https://wiki.dendron.so/notes/23a1b942-99af-45c8-8116-4f4bb7dccd21/#installation

Installing `dendron-cli` locally instead of globally
```bash
npm install @dendronhq/dendron-cli
```

## Preview

```
./node_modules/.bin/dendron buildSite  --stage dev --serve
```

## Build

```
./node_modules/.bin/dendron buildSite --stage prod
```

## Expose with caddy

```
caddy run
```