const fs = require('fs');
const { ethers, upgrades } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { task } = require('hardhat/config');

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

const {
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

task('upgarde')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { arrival } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const arrivalContract = await ethers.getContractAt('ProphetsArrival', arrival);

    const prophetsArrivalV2Mock = await ethers.getContractFactory('ProphetsArrival');
    console.log('Upgrading arrival contract...');
    const upgradedArrival = await upgrades.upgradeProxy(arrivalContract, prophetsArrivalV2Mock.connect(owner), {
      constructorArgs: [
        '0x26231A65EF80706307BbE71F032dc1e5Bf28ce43', // Prophets NFT
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        1636992000, // Start TS
      ],
    });
    console.log('Arrival contract has been upgraded 🚀');
  });
