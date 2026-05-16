---
name: shelby-benchmarking
description: Benchmark and monitor Shelby Protocol storage performance. Use when measuring upload/download latency, testing blob integrity, comparing file sizes, stress-testing endpoints, or generating performance reports for Shelby on Aptos.
---

# Shelby Benchmarking & Performance Testing

Measure, monitor, and report on Shelby Protocol storage performance. Covers latency benchmarking, throughput testing, integrity verification, and automated reporting.

Requires: Shelby CLI installed and configured. See `shelby-cli` skill for setup.

## Quick Benchmark

```bash
# Generate test files
dd if=/dev/urandom of=/tmp/bench-10kb.bin bs=1024 count=10
dd if=/dev/urandom of=/tmp/bench-100kb.bin bs=1024 count=100
dd if=/dev/urandom of=/tmp/bench-1mb.bin bs=1024 count=1024
dd if=/dev/urandom of=/tmp/bench-10mb.bin bs=1024 count=10240

# Time each upload
time shelby upload /tmp/bench-10kb.bin bench/10kb.bin -e "in 7 days" --assume-yes
time shelby upload /tmp/bench-100kb.bin bench/100kb.bin -e "in 7 days" --assume-yes
time shelby upload /tmp/bench-1mb.bin bench/1mb.bin -e "in 7 days" --assume-yes
time shelby upload /tmp/bench-10mb.bin bench/10mb.bin -e "in 7 days" --assume-yes

# Time downloads
time shelby download bench/10kb.bin /tmp/dl-10kb.bin
time shelby download bench/1mb.bin /tmp/dl-1mb.bin
```

## Reference Latency (shelbynet, May 2026)

Measured on Apple M4 Pro, home broadband, Almaty KZ:

| File size | Upload time | Notes |
|-----------|------------|-------|
| 0.3 KB | 5.97s | JSON manifest |
| 10 KB | 8.14s | Binary blob |
| 100 KB | 10.88s | Binary blob |
| 1 MB | 8.24s | Binary blob |
| Download (3 files) | 1.2s | All sizes |

Upload latency is relatively flat for small files (sub-1MB), indicating fixed per-transaction overhead of ~6-8s on shelbynet. Download is significantly faster.

## Integrity Verification

```bash
# Upload
shelby upload ./testfile.txt verify/testfile.txt -e "in 7 days" --assume-yes

# Download back
shelby download verify/testfile.txt /tmp/verify-result.txt

# Compare checksums (must match)
shasum -a 256 ./testfile.txt /tmp/verify-result.txt
```

If checksums differ, report on https://github.com/shelby/feedback.

## Automated Benchmark Script

Save as `shelby-bench.sh`:

```bash
#!/bin/bash
SIZES=(10 100 1024 10240)
LABELS=("10KB" "100KB" "1MB" "10MB")
DATE=$(date +%Y%m%d-%H%M)
REPORT="bench-report-$DATE.csv"

echo "size,upload_seconds,download_seconds,integrity,timestamp" > "$REPORT"

for i in "${!SIZES[@]}"; do
  FILE="/tmp/bench-${LABELS[$i]}.bin"
  BLOB="bench-$DATE/${LABELS[$i]}.bin"
  DL="/tmp/dl-${LABELS[$i]}.bin"

  dd if=/dev/urandom of="$FILE" bs=1024 count="${SIZES[$i]}" 2>/dev/null

  UPLOAD=$( { time shelby upload "$FILE" "$BLOB" -e "in 7 days" --assume-yes; } 2>&1 | grep real | awk '{print $2}')
  DOWNLOAD=$( { time shelby download "$BLOB" "$DL"; } 2>&1 | grep real | awk '{print $2}')

  ORIG=$(shasum -a 256 "$FILE" | awk '{print $1}')
  DLHASH=$(shasum -a 256 "$DL" | awk '{print $1}')
  if [ "$ORIG" = "$DLHASH" ]; then INTEGRITY="pass"; else INTEGRITY="fail"; fi

  echo "${LABELS[$i]},$UPLOAD,$DOWNLOAD,$INTEGRITY,$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT"
  echo "Done ${LABELS[$i]}: upload=$UPLOAD download=$DOWNLOAD integrity=$INTEGRITY"
done

echo "Report: $REPORT"
cat "$REPORT"
```

## Rate Limit Testing

Without API key: 40,000 compute units per 300s per IP.

```bash
for i in $(seq 1 20); do
  echo "test $i" > /tmp/rl-$i.txt
  shelby upload /tmp/rl-$i.txt ratelimit/test-$i.txt -e "in 1 day" --assume-yes
done
```

If you hit `status 429`, add an API key from https://geomi.dev to `~/.shelby/config.yaml`:

```yaml
shelby_network:
  rpc_endpoint: https://api.shelbynet.shelby.xyz/shelby
  api_key: aptoslabs_YOUR_KEY
```

## Cleanup

```bash
shelby delete bench/ -r --assume-yes
```

## Reporting

When sharing results, always include: CLI version, hardware, OS, network type and location, context (shelbynet/testnet), API key usage, and date.
