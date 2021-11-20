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

task('babl').setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
  const nft = await ethers.getContractAt('Prophets', '0x26231A65EF80706307BbE71F032dc1e5Bf28ce43');
  let prophetsSupply = await nft.prophetsSupply();
  const totalSupply = await nft.totalSupply();
  let totalBabl = prophetsSupply.mul(unit(5));

  for (let i = prophetsSupply; i < totalSupply; i++) {
    const id = await nft.tokenByIndex(i);
    console.log('id', id.toString());
    const [loot, ...rest] = await nft.getAttributes(id);
    totalBabl = totalBabl.add(loot);
  }

  console.log(`Total BABL: ${ethers.utils.formatUnits(totalBabl)}`);
});
