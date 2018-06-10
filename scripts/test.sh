#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
   # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}
if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 10 accounts with balance 1M ether, needed for high-value tests.
  local accounts=(
    --account="35e6f2d0967f19296cf0a44c9f861e5df1f134efc93e669c7ac1b7894efe13fa,1000000000000000000000000"
    --account="e8db4fa63a1209a0636cfcc909de574e74ee18871680bd0d10fc53aae8b11fe8,1000000000000000000000000"
    --account="6ccb4a976da10085f43b600ca2b1ef284461a86ceef9b0df8d481d13a6bd4f10,1000000000000000000000000"
    --account="460e389ae28c0e2eb31d733eedcfaf0952a22cd8835a16bb0e3286e2821b8fac,1000000000000000000000000"
    --account="8a50634922a61d14b22cbb837eee8c3d36180d50586a63b0acb674f7e2de7a95,1000000000000000000000000"
    --account="2b0c9710213bf0f34131d0ee103ab12a79d65383d5e433e5dc5acf3f6161af2f,1000000000000000000000000"
    --account="2bf949eb684e17e4870f628afa87ea3b414a3f6d0b77138325f5cd6d9f6af78e,1000000000000000000000000"
    --account="3fe6204d685a9ab7b08443fd60683ff8f40b9e56742058344a0e4f1ae3b17c6b,1000000000000000000000000"
    --account="ea8b7c7e31f3a47c0a73c909d833df8af0dce80e5ee533b8c88d0fc20da82836,1000000000000000000000000"
    --account="e33ff69f6a56f8da592bbc4eed72de6f967d391ad230f4f9f6c7b0de3ea7377e,1000000000000000000000000"
  )
  if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  else
    node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" > /dev/null &
  fi

  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
  
  webpack && run-s babel:src babel:test
  run-s truffle:compile copy-artifacts
  truffle migrate --network=ganache
  mocha lib/test/**/*_test.js --timeout 10000 --bail --exit
fi

node_modules/.bin/truffle test "$@"
