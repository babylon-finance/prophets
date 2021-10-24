require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');

const OPTIMIZER = !(process.env.OPTIMIZER === 'false');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: OPTIMIZER,
            runs: 999,
          },
        },
      },
      {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: OPTIMIZER,
            runs: 999,
          },
        },
      },
    ],
  },
};
