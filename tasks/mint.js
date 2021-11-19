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

task('mint')
  .addParam('mints', '')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { arrival, mints } = args;

    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const arrivalContract = await ethers.getContractAt('ProphetsArrival', arrival);

    const sigsJSON = JSON.parse(fs.readFileSync(mints));

    const calldata = arrivalContract.interface.encodeFunctionData('batchMintGreat', [
      Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].number),
      Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].secondPrice),
      Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].amount),
      Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].nonce),
      Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).v),
      Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).r),
      Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).s),
    ]);

    console.log('calldata', calldata);

    // await arrival.connect().batchMintGreat(
    //   Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].number),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].secondPrice),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].amount),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => sigsJSON[n].nonce),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).v),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).r),
    //   Array.from(Array(sigsJSON.length).keys(), (n) => ethers.utils.splitSignature(sigsJSON[n].signature).s),
    // );
  });
