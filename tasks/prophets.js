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

task('prophets')
  .addParam('prophets', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { prophets } = args;
    const prophetsJSON = JSON.parse(fs.readFileSync(prophets));

    const totalBabl = prophetsJSON.reduce((sum, cur) => (sum += +cur.babl), 0);
    const greatsBabl = prophetsJSON.slice(8000).reduce((sum, cur) => (sum += +cur.babl), 0);
    const greatsFloor = prophetsJSON.slice(8000).reduce((sum, cur) => (sum += +cur.floorPrice), 0);

    console.log(`Greats is ${greatsBabl} BABL`);
    console.log(`Greats floor is ${greatsFloor} WETH`);
    console.log(`TotalBabl is ${totalBabl} BABL`);
  });
