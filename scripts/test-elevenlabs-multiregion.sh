#!/bin/bash
# test-elevenlabs-multiregion.sh
# Run ElevenLabs latency tests from multiple regions using SSH or Docker
# Usage: ./test-elevenlabs-multiregion.sh

set -e

# Configuration
SCRIPT_PATH="test-elevenlabs-latency.js"
TEST_ITERATIONS="${TEST_ITERATIONS:-5}"
RESULTS_DIR="./elevenlabs-latency-results"

# Regions to test (customize with your server IPs/hostnames)
# Format: "name:user@host" or "local" for current machine
REGIONS=(
    "local"
    # Add your remote servers here:
    # "mumbai:ubuntu@mumbai-server.example.com"
    # "singapore:ubuntu@singapore-server.example.com"
    # "us-east:ubuntu@virginia-server.example.com"
    # "eu-west:ubuntu@ireland-server.example.com"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ElevenLabs Multi-Region Latency Test Runner - 2026           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo -e "${RED}ERROR: ELEVENLABS_API_KEY environment variable is required${NC}"
    echo ""
    echo "Usage:"
    echo "  export ELEVENLABS_API_KEY=your_api_key"
    echo "  ./test-elevenlabs-multiregion.sh"
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}Test Configuration:${NC}"
echo "  Iterations: $TEST_ITERATIONS"
echo "  Results dir: $RESULTS_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Function to run test on a region
run_test() {
    local region=$1
    local spec=$2

    echo -e "${BLUE}Testing region: ${region}${NC}"

    local output_file="${RESULTS_DIR}/${TIMESTAMP}_${region}.json"

    if [ "$spec" == "local" ]; then
        # Run locally
        ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" \
        TEST_ITERATIONS="$TEST_ITERATIONS" \
        node "$SCRIPT_PATH" 2>&1 | tee "${RESULTS_DIR}/${TIMESTAMP}_${region}.log"

        # Extract JSON from output
        grep -A 1000 "JSON Results" "${RESULTS_DIR}/${TIMESTAMP}_${region}.log" | \
            tail -n +2 | head -n -5 > "$output_file" || true
    else
        # Run remotely via SSH
        local user_host="${spec#*:}"

        echo "  Connecting to $user_host..."

        # Copy script to remote
        scp -q "$SCRIPT_PATH" "$user_host:/tmp/"

        # Run test remotely
        ssh "$user_host" "
            export ELEVENLABS_API_KEY='$ELEVENLABS_API_KEY'
            export TEST_ITERATIONS='$TEST_ITERATIONS'
            cd /tmp && node test-elevenlabs-latency.js
        " 2>&1 | tee "${RESULTS_DIR}/${TIMESTAMP}_${region}.log"

        # Extract JSON
        grep -A 1000 "JSON Results" "${RESULTS_DIR}/${TIMESTAMP}_${region}.log" | \
            tail -n +2 | head -n -5 > "$output_file" || true
    fi

    if [ -s "$output_file" ]; then
        echo -e "${GREEN}  ✓ Results saved to $output_file${NC}"
    else
        echo -e "${RED}  ✗ Failed to extract results${NC}"
    fi
    echo ""
}

# Run tests for each region
for entry in "${REGIONS[@]}"; do
    if [ "$entry" == "local" ]; then
        run_test "local" "local"
    else
        region="${entry%%:*}"
        spec="$entry"
        run_test "$region" "$spec"
    fi
done

# Generate summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Generating Summary Report...${NC}"
echo ""

# Create summary file
SUMMARY_FILE="${RESULTS_DIR}/${TIMESTAMP}_summary.md"

cat > "$SUMMARY_FILE" << EOF
# ElevenLabs Streaming TTS Latency Report
**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Test ID:** $TIMESTAMP

## Configuration
- Model: ${ELEVENLABS_MODEL:-eleven_turbo_v2_5}
- Voice ID: ${ELEVENLABS_VOICE_ID:-21m00Tcm4TlvDq8ikWAM}
- Iterations per test: $TEST_ITERATIONS

## Results by Region

EOF

# Parse and summarize results
for jsonfile in "${RESULTS_DIR}/${TIMESTAMP}"_*.json; do
    if [ -s "$jsonfile" ]; then
        region=$(basename "$jsonfile" | sed "s/${TIMESTAMP}_//" | sed 's/.json//')

        echo "### $region" >> "$SUMMARY_FILE"
        echo "" >> "$SUMMARY_FILE"

        # Extract key metrics using node
        node -e "
            const fs = require('fs');
            try {
                const data = JSON.parse(fs.readFileSync('$jsonfile', 'utf8'));
                console.log('- **Location:** ' + (data.location?.city || 'Unknown') + ', ' + (data.location?.country || 'Unknown'));
                console.log('- **Network:** DNS ' + (data.network?.dnsResolution || 'N/A') + 'ms, TCP ' + (data.network?.tcpConnection || 'N/A') + 'ms');

                if (data.results?.websocket?.pcm_22050?.ttfb) {
                    const ws = data.results.websocket.pcm_22050;
                    console.log('- **WebSocket PCM:** TTFB ' + ws.ttfb.avg + 'ms (avg), ' + ws.ttfb.p95 + 'ms (p95)');
                }
                if (data.results?.streamingRest?.['mp3_44100_128']?.ttfb) {
                    const sr = data.results.streamingRest['mp3_44100_128'];
                    console.log('- **Streaming REST:** TTFB ' + sr.ttfb.avg + 'ms (avg), ' + sr.ttfb.p95 + 'ms (p95)');
                }
            } catch(e) {
                console.log('- Error parsing results');
            }
        " >> "$SUMMARY_FILE" 2>/dev/null || echo "- Error parsing results" >> "$SUMMARY_FILE"

        echo "" >> "$SUMMARY_FILE"
    fi
done

cat >> "$SUMMARY_FILE" << EOF

## Recommendations

For voice applications from India:
1. **WebSocket Streaming** with PCM format provides lowest TTFB
2. Target TTFB under 300ms for natural conversation flow
3. Consider edge caching for repeated phrases
4. Monitor P95 latency for consistent user experience

---
*Generated by ElevenLabs Latency Test Suite*
EOF

echo -e "${GREEN}Summary saved to: $SUMMARY_FILE${NC}"
echo ""

# Print quick summary to console
echo -e "${BLUE}Quick Summary:${NC}"
cat "$SUMMARY_FILE" | grep -E "^###|WebSocket|Streaming REST" | head -20
echo ""

echo -e "${GREEN}All tests completed!${NC}"
echo "Results directory: $RESULTS_DIR"
