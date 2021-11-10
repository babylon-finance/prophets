const fs = require('fs');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { task } = require('hardhat/config');

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
} = require('../lib/helpers');

function getCount(path) {
  return JSON.parse(fs.readFileSync(path)).map((s) => s.address).length;
}

function getRootFromJSON(path) {
  return getMerkleTree(JSON.parse(fs.readFileSync(path)).map((s) => s.address)).getHexRoot();
}

//npx hardhat whitelist --settlers ./settlers.json --firsts ./firsts.json  --seconds ./seconds.json
task('whitelist')
  .addParam('settlers', '')
  .addParam('firsts', '')
  .addParam('seconds', '')
  .addParam('arrival', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { settlers, firsts, seconds, arrival } = args;

    const [deployer, owner] = await ethers.getSigners();

    const arrivalContract = await ethers.getContractAt('ProphetsArrival', arrival);
    console.log(
      `Updating whitelist with settlers (${getCount(settlers)}), firsts (${getCount(
        settlers,
      )}), and seconds (${getCount(settlers)}) `,
    );
    const tx = await arrivalContract
      .connect(owner)
      .addUsersToWhitelist(getRootFromJSON(settlers), getRootFromJSON(firsts), getRootFromJSON(seconds));
    console.log(`Tx send ${tx.hash}. Awaiting...`);
    await tx.wait();
    console.log('Whitelist updated 🏰');
  });
