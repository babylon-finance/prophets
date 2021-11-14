const fs = require('fs');
const { task } = require('hardhat/config');
const {
  from,
  getMerkleTree,
  unit,
  setTime,
  takeSnapshot,
  restoreSnapshot,
  getBidSig,
  hashUser,
  ZERO_ADDRESS,
  HASH_ZERO,
  getPrices,
  BlockNativePriceProvider,
} = require('../lib/helpers');

const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

task('proof')
  .addParam('user', '')
  .addParam('list', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { user, list } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const merkleTree = getMerkleTree(JSON.parse(fs.readFileSync(list)));
    const proof = merkleTree.getHexProof(hashUser(user));

    console.log('proof', proof);
  });
