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

function getCount(path) {
  return JSON.parse(fs.readFileSync(path)).length;
}

function getRootFromJSON(path) {
  return getMerkleTree(JSON.parse(fs.readFileSync(path))).getHexRoot();
}

//npx hardhat whitelist --settlers ./settlers.json --firsts ./firsts.json  --seconds ./seconds.json
task('whitelist')
  .addParam('settlers', '')
  .addParam('firsts', '')
  .addParam('seconds', '')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { settlers, firsts, seconds, arrival } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);

    const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const arrivalContract = await ethers.getContractAt('ProphetsArrival', arrival);
    console.log(
      `Updating whitelist with settlers (${getCount(settlers)}), first round (${getCount(
        firsts,
      )}), and second round(${getCount(seconds)}) `,
    );
    const tx = await arrivalContract
      .connect(owner)
      .addUsersToWhitelist(getRootFromJSON(settlers), getRootFromJSON(firsts), getRootFromJSON(seconds));
    console.log(`Tx send ${tx.hash}. Awaiting...`);
    await tx.wait();
    console.log('Whitelist updated 🏰');
  });
