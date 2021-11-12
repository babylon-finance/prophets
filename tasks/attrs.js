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

task('attrs')
  .addParam('prophets', '')
  .addParam('nft', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { prophets, nft } = args;
    const { chainId } = await ethers.provider.getNetwork();
    console.log('chainId', chainId);
    const owner =
      chainId !== 31337
        ? new ethers.Wallet(`0x${process.env.OWNER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
        : (await ethers.getSigners())[0];

    const nftContract = await ethers.getContractAt('Prophets', nft);
    const prophetsJSON = JSON.parse(fs.readFileSync(prophets));
    const greats = prophetsJSON.slice(8000);

    for (let i = 0; i < 10; i++) {
      const part = greats.slice(i * 100, i * 100 + 100);
      const ids = Array.from(Array(100).keys(), (n) => 8001 + n + i * 100);
      console.log(`Setting attributes to 
    [${ids}]`);
      const tx = await nftContract.connect(owner).setProphetsAttributes(
        ids,
        part.map((p) => unit(p.babl)),
        part.map((p) => from(+p.creatorBonus * 100)),
        part.map((p) => from(+p.lpBonus * 100)),
        part.map((p) => from(+p.voterBonus * 100)),
        part.map((p) => from(+p.strategistBonus * 100)),
      );
      console.log(`Waiting for the tx ${tx.hash} to mine.`);
      await tx.wait();
    }
    console.log(`All attribute are set 🧙`);
  });
