require('dotenv/config');

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('solidity-coverage');

const OPTIMIZER = !(process.env.OPTIMIZER === 'false');
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';
const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

const OWNER_PRIVATE_KEY =
  process.env.OWNER_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

const defaultNetwork = 'hardhat';
const BLOCK_NUMBER = process.env.BLOCK_NUMBER || 13171630;

const CHAIN_IDS = {
  hardhat: 31337,
  kovan: 42,
  goerli: 5,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
};

module.exports = {
  defaultNetwork,

  gasReporter: {
    currency: 'USD',
    coinmarketcap: 'f903b99d-e117-4e55-a7a8-ff5dd8ad5bed',
    enabled: !!process.env.REPORT_GAS,
  },

  networks: {
    hardhat: {
      chainId: CHAIN_IDS.hardhat,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: false,
      saveDeployments: true,
      gas: 15e6,
      initialBaseFeePerGas: 0,
    },
    mainnet: {
      chainId: CHAIN_IDS.mainnet,
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`, `0x${OWNER_PRIVATE_KEY}`],
      saveDeployments: true,
    },
    rinkeby: {
      chainId: CHAIN_IDS.rinkeby,
      url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`, `0x${OWNER_PRIVATE_KEY}`],
      saveDeployments: true,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      [CHAIN_IDS.mainnet]: 0,
      [CHAIN_IDS.kovan]: 0,
      [CHAIN_IDS.ropsten]: 0,
      [CHAIN_IDS.goerli]: 0,
      [CHAIN_IDS.rinkeby]: 0,
    },
    owner: {
      default: 1,
      [CHAIN_IDS.mainnet]: 1,
      [CHAIN_IDS.kovan]: 1,
      [CHAIN_IDS.ropsten]: 1,
      [CHAIN_IDS.goerli]: 1,
      [CHAIN_IDS.rinkeby]: 1,
    },
  },

  mocha: {
    timeout: 9999999,
  },

  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: OPTIMIZER,
            runs: 999,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
              },
            },
          },
        },
      },
    ],
  },
};
