const fs = require('fs');
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

task('upgrade-arrival')
  .addParam('impl', '')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice, upgrades }, runSuper) => {
    await hre.run('compile');

    const { arrival, impl } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const arrivalFactory = await ethers.getContractFactory(impl, owner);
    console.log('Upgrading arrival contract...');
    const upgradedArrival = await upgrades.upgradeProxy(arrival, arrivalFactory, {
      constructorArgs: [
        '0x26231A65EF80706307BbE71F032dc1e5Bf28ce43', // Prophets NFT
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        1636992000, // Start TS
      ],
    });
    console.log('Arrival contract has been upgraded 🚀');

    console.log('Verifying on Etherscan..');
    await hre.run('verify:verify', {
      contract: `contracts/ProphetsArrival.sol:${impl}`,
      address: await upgrades.erc1967.getImplementationAddress(arrival),
      constructorArguments: [
        '0x26231A65EF80706307BbE71F032dc1e5Bf28ce43', // Prophets NFT
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        1636992000, // Start TS
      ],
    });
    console.log('Verified ✅');
  });
