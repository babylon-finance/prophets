require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('solidity-coverage');

const OPTIMIZER = !(process.env.OPTIMIZER === 'false');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
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
