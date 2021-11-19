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

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

task('babl')
  .addParam('sigs', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
  const { sigs } = args;

  const sigsJSON = JSON.parse(fs.readFileSync(sigs));

  const nft = await ethers.getContractAt('Prophets', '0x26231A65EF80706307BbE71F032dc1e5Bf28ce43');
  const prophetsSupply = await nft.prophetsSupply();

  console.log(`Total BABL: ${ethers.utils.formatUnits(prophetsSupply.mul(unit(5)))}`);
});
