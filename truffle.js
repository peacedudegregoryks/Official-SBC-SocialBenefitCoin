require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 4500000,
    },
    mainnet: {
      host: 'localhost',
      port: 8545,
      network_id: '1', // Match any network id
      gas: 3500000,
      gasPrice: 10000000000
    },
    ropsten: {
      host: 'localhost',
      from: '0xC046D0A43697221B329f42aF4C78792a93B4E2Ad',
      port: 8545,
      network_id: '3', // Match any network id
      gas: 4500000,
      gasPrice: 330000000000
    },
    kovan: {
      host: 'localhost',
      from: '0x2F2caEf3f5C8298f3c3fed440e6D47B7531C97CA',
      port: 8545,
      network_id: '42', // Match any network id
      gas: 4500000,
      gasPrice: 130000000000
    },
    local: {
      host: 'localhost',
      port: 8545,
      gas: 4.612e6,
      gasPrice: 0x01,
      network_id: '*',
    },
    rinkeby: {
      network_id: 4,
      host: "localhost",
      port:  8545,
      account: 0x8946D0F92cB21F1c41eDaB2eD8a33F612FE4a3CA,
      gas:2000000
      //gasPrice: 100000000000
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8545,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },
 //   rpc: {
 // host: 'localhost',
 // post:8080
 //   },
  mocha: {
    useColors: true,
    slow: 30000,
    bail: true,
  },
  dependencies: {},
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
