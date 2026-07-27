---
name: OTA hermesc passthrough for eas update
description: How to push OTA updates (eas update) from Replit when the local linux hermesc binary is too old to compile the bundle.
---

# OTA hermesc passthrough for `eas update`

## The problem
`eas update` runs `expo export` locally, which compiles the JS bundle to Hermes bytecode using the hermesc binary bundled with react-native. The linux64 hermesc binary in RN 0.81.5 is v0.12.0 and rejects private class fields (`this.#x`, etc.) used in RN's own source. Cloud EAS build servers have a newer hermesc and don't have this problem — but `eas update` always runs locally.

## Critical: metro.config.js transform profile must be "default"
`unstable_transformProfile: "hermes-stable"` tells Babel to leave private class fields (`#x`, `#y`, etc.) as-is, assuming the device Hermes handles them natively. EAS build workers using newer Xcode/iOS SDK (iOS 26+) bundle a Hermes version that does NOT support them → build fails with "private properties are not supported". **Always use `"default"`** so Babel transforms private fields before Hermes sees them. Do not change this back to `"hermes-stable"`.

## The fix
Temporarily replace hermesc with a passthrough shell script that copies the JS bundle to the output file unchanged. Hermes on-device auto-detects that the file is raw JS (no magic header bytes) and interprets it — this is fully supported and is how Metro dev servers work.

**Why:**
The device runtime (Hermes in the iOS binary) can execute both HBC bytecode AND raw JavaScript. OTA updates don't have to be bytecode. Performance is slightly lower than bytecode but correctness is unaffected.

## Passthrough script template

```bash
HERMESC=<path to hermesc binary>

# Back up real binary
cp "$HERMESC" "${HERMESC}.bak"

cat > "$HERMESC" << 'SCRIPT'
#!/bin/bash
OUT=""
IN=""
ARGS=("$@")
for (( i=0; i<${#ARGS[@]}; i++ )); do
  if [[ "${ARGS[$i]}" == "-out" ]]; then OUT="${ARGS[$((i+1))]}"; fi
  if [[ "${ARGS[$i]}" == *.js && -f "${ARGS[$i]}" ]]; then IN="${ARGS[$i]}"; fi
done
[[ -z "$OUT" || -z "$IN" ]] && { echo "passthrough: missing args" >&2; exit 1; }
cp "$IN" "$OUT"
# Minimal valid v3 source map — required by Metro's merge step
printf '{"version":3,"sources":[],"sourcesContent":[],"mappings":"","names":[]}' > "${OUT}.map"
exit 0
SCRIPT
chmod +x "$HERMESC"

# Run eas update here...

# Restore real binary after
mv "${HERMESC}.bak" "$HERMESC"
```

## The real hermesc path (RN 0.81.5 in this project)
```
node_modules/.pnpm/react-native@0.81.5_@babel+core@7.29.0_@types+react@19.1.17_react@19.1.0/node_modules/react-native/sdks/hermesc/linux64-bin/hermesc
```

## How to apply for future OTA pushes
- Always back up first and restore after
- The source map must be a valid v3 JSON (not `{}`), otherwise Metro's merge step throws "Unrecognized source map format version: undefined"
- This approach works for any `eas update` push from this Replit environment
