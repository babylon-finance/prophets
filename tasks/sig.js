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

task('sig')
  .addParam('sig', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { sig } = args;

    const signature = ethers.utils.splitSignature(sig);
    console.log('signature ', signature);
  });
