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

task('upgrade-nft')
  .addParam('impl', '')
  .addParam('nft', '')
  .setAction(async (args, { getContract, ethers, getGasPrice, upgrades }, runSuper) => {
    await hre.run('compile');

    const { nft, impl } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const nftFactory = await ethers.getContractFactory(impl, owner);
    console.log('Upgrading nft contract...');
    await upgrades.upgradeProxy(nft, nftFactory, {
      constructorArgs: [
        '0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74', // BABL
      ],
    });
    console.log('NFT contract has been upgraded 🚀');

    console.log('Verifying on Etherscan..');
    await hre.run('verify:verify', {
      contract: `contracts/Prophets.sol:${impl}`,
      address: await upgrades.erc1967.getImplementationAddress(nft),
      constructorArguments: [
        '0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74', // BABL
      ],
    });
    console.log('Verified ✅');
  });
