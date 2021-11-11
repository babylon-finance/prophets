const ethers = require('ethers');
const axios = require('axios');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

function unit(value = 1) {
  return ethers.utils.parseEther(value.toString());
}

const setCode = async (target, mock) => {
  const hre = require('hardhat');
  await hre.network.provider.send('hardhat_setCode', [target, mock]);
};

const impersonateAddress = async (address) => {
  const hre = require('hardhat');
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });

  const signer = await ethers.provider.getSigner(address);
  signer.address = signer._address;

  return signer;
};

const takeSnapshot = async () => {
  const hre = require('hardhat');
  return await hre.network.provider.request({
    method: 'evm_snapshot',
    params: [],
  });
};

const restoreSnapshot = async (id) => {
  const hre = require('hardhat');
  await hre.network.provider.request({
    method: 'evm_revert',
    params: [id],
  });
};

/**
 * Advance blockchain time by value. Has a random chance to deviate by 1 second.
 * Consider this during tests. Use `closeTo`.
 * @param {number} value - Amount of time to advance time by.
 */
async function increaseTime(value) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    value = ethers.BigNumber.from(value);
  }
  await ethers.provider.send('evm_increaseTime', [value.toNumber()]);
  await ethers.provider.send('evm_mine');
}

async function setTime(value) {
  await network.provider.send('evm_setNextBlockTimestamp', [value]);
  await network.provider.send('evm_mine');
}

function getBidSigHash(arrival, bid, nonce) {
  const BID_SIG_TYPEHASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Bid(uint256 _bid,uint256 _nonce)'));

  let payload = ethers.utils.defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256', 'uint256'],
    [BID_SIG_TYPEHASH, arrival, bid, nonce],
  );

  return ethers.utils.keccak256(payload);
}

async function getBidSig(signer, arrival, bid, nonce) {
  let payloadHash = getBidSigHash(arrival, bid, nonce);

  let signature = await signer.signMessage(ethers.utils.arrayify(payloadHash));
  return ethers.utils.splitSignature(signature);
}

function hashUser(user) {
  return Buffer.from(ethers.utils.solidityKeccak256(['address'], [user]).slice(2), 'hex');
}

function getMerkleTree(users) {
  return new MerkleTree(
    users.map((user) => hashUser(user)),
    keccak256,
    { sortPairs: true },
  );
}

const BLOCKNATIVE_API_URL = 'https://api.blocknative.com';

/**
 * Returns gas prices in wei
 */
async function getPrices() {
  function getFees(prices, confidence) {
    const price = prices.find((ep) => ep.confidence === confidence);
    return {
      maxPriorityFeePerGas: Math.round(price.maxPriorityFeePerGas * 10 ** 9),
      maxFeePerGas: Math.round(price.maxFeePerGas * 10 ** 9),
    };
  }

  const config = {
    headers: {
      Authorization: process.env.BLOCKNATIVE_API_KEY,
    },
  };

  const { data } = await axios.get(`${BLOCKNATIVE_API_URL}/gasprices/blockprices`, config);

  const prices = data.blockPrices[0].estimatedPrices;
  // Grab prices and convert to wei for backwards compatibility
  return {
    fast: getFees(prices, 99),
    standard: getFees(prices, 95),
    standard: getFees(prices, 70),
    baseFeePerGas: data.blockPrices[0].baseFeePerGas * 10 ** 9,
  };
}

class BlockNativePriceProvider extends ethers.providers.JsonRpcProvider {
  constructor(url) {
    super(url);
  }

  async getFeeData() {
    const prices = await getPrices();
    return {
      gasPrice: undefined,
      maxFeePerGas: ethers.BigNumber.from(prices.fast.maxFeePerGas),
      maxPriorityFeePerGas: ethers.BigNumber.from(prices.fast.maxPriorityFeePerGas),
    };
  }

  async getGasPrice() {
    return undefined;
  }
}

module.exports = {
  BlockNativePriceProvider,
  getPrices,
  unit,
  from: ethers.BigNumber.from,
  increaseTime,
  setTime,
  impersonateAddress,
  takeSnapshot,
  restoreSnapshot,
  setCode,
  getBidSigHash,
  getBidSig,
  hashUser,
  getMerkleTree,
  ZERO_ADDRESS: ethers.constants.AddressZero,
  HASH_ZERO: ethers.constants.HashZero,
};
