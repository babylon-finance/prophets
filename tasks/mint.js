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

task('mint')
  .addParam('sigs, '')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const arrivalContract = await ethers.getContractAt('ProphetsArrival', arrival);

    const sigsJSON = JSON.parse(fs.readFileSync(sigs));

    let sigs = [];
    for (let i = 0; i < 100; i++) {
      const part = sigsJSON.slice(i * 10, i * 10 + 10);
      await arrival.connect(owner).batchMintGreat(
        Array.from(Array(10).keys(), (n) => PROPHETS_NUM + n + 1),
        Array.from(Array(10).keys(), (n) => unit()),
        Array.from(Array(10).keys(), (n) => unit()),
        Array.from(Array(10).keys(), (n) => n + 1),
        Array.from(Array(10).keys(), (n) => sigs[n].v),
        Array.from(Array(10).keys(), (n) => sigs[n].r),
        Array.from(Array(10).keys(), (n) => sigs[n].s),
      );
      sigs.push(await getBidSig(ramon, arrival.address, unit(), i + 1));
    }
  });
