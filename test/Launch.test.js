const { expect } = require('chai');
const fs = require('fs');
const { ethers, upgrades } = require('hardhat');

const { onlyFull } = require('../lib/test-helpers');
const {
  hashUser,
  getMerkleTree,
  unit,
  from,
  setTime,
  takeSnapshot,
  restoreSnapshot,
  getBidSig,
  ZERO_ADDRESS,
  HASH_ZERO,
} = require('../lib/helpers');

// Monday, 15 November 2021, 8:00:00 AM in Timezone (GMT -8:00) Pacific Time (US & Canada)
const EVENT_STARTS_TS = 1636992000;
const SECOND_ROUND_TS = EVENT_STARTS_TS + 24 * 3600;
const THIRD_ROUND_TS = SECOND_ROUND_TS + 24 * 3600;
const EVENT_ENDS_TS = THIRD_ROUND_TS + 86400 * 2 + 8 * 3600;
const PROPHETS_NUM = 8000;
const TREASURY = '0xD7AAf4676F0F52993cb33aD36784BF970f0E1259';

const SETTLERS_NUM = 2000;
const FIRSTS_NUM = 2000;
const SECONDS_NUM = 2000;
const PUBLIC_NUM = 2000;
const GREAT_NUM = 1000;

describe('Launch', () => {
  let deployer;
  let ramon;
  let tyler;
  let minter;
  let owner;
  let nft;
  let arrival;
  let prophets;
  let greatsJSON;
  let bablToken;
  let wethToken;
  let snapshotId;
  let settlers;
  let firsts;
  let seconds;
  let public;
  let greats;
  let settlersTree;
  let firstsTree;
  let secondsTree;

  async function getWallets(count, amount) {
    const wallets = [];
    for (let i = 0; i < count; i++) {
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      wallets.push(wallet);
      if (amount > 0) {
        await deployer.sendTransaction({
          to: wallet.address,
          value: unit(amount),
        });
      }
    }
    return wallets;
  }

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    greatsJSON = prophets.slice(8000);
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function () {
    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();
  });

  it('deploys NFT and Arrival', async function () {
    const erc20Factory = await ethers.getContractFactory('ERC20Mock');
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));

    const prophetsFactory = await ethers.getContractFactory('Prophets');

    nft = await upgrades.deployProxy(prophetsFactory, ['https://babylon.finance/api/v1/'], {
      kind: 'uups',
      constructorArgs: [bablToken.address],
    });

    await nft.transferOwnership(owner.address);
    await bablToken.connect(owner).transfer(nft.address, unit(70000));

    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));

    const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
    arrival = await upgrades.deployProxy(arrivalFactory, [], {
      kind: 'uups',
      constructorArgs: [nft.address, wethToken.address, 1636992000],
    });
    await arrival.transferOwnership(owner.address);

    await nft.connect(owner).setMinter(arrival.address);
  });

  it('set great prophets attributes', async function () {
    for (let i = 0; i < 10; i++) {
      const part = greatsJSON.slice(i * 100, i * 100 + 100);

      const bablLoots = part.map((p) => unit(p.babl));
      const creatorBonuses = part.map((p) => from(+p.creatorBonus * 100));
      const lpBonuses = part.map((p) => from(+p.lpBonus * 100));
      const voterMultipliers = part.map((p) => from(+p.voterBonus * 100));
      const strategistMultipliers = part.map((p) => from(+p.strategistBonus * 100));

      await nft.connect(owner).setProphetsAttributes(
        Array.from(Array(100).keys(), (n) => 8001 + n + i * 100),
        bablLoots,
        creatorBonuses,
        lpBonuses,
        voterMultipliers,
        strategistMultipliers,
      );
    }
  });

  it('add settlers, firsts, and seconds to whitelists', async function () {
    settlers = await getWallets(SETTLERS_NUM, 0.1);
    firsts = await getWallets(FIRSTS_NUM, 0.25);
    seconds = await getWallets(SECONDS_NUM, 0.25);
    public = await getWallets(PUBLIC_NUM, 0.25);

    settlersTree = getMerkleTree(settlers.map((s) => s.address));
    firstsTree = getMerkleTree(firsts.map((s) => s.address));
    secondsTree = getMerkleTree(seconds.map((s) => s.address));

    await arrival
      .connect(owner)
      .addUsersToWhitelist(settlersTree.getHexRoot(), firstsTree.getHexRoot(), secondsTree.getHexRoot());
  });

  it('event is open at Nov 15', async function () {
    await setTime(EVENT_STARTS_TS);
    expect(await arrival.eventStartsTS()).to.eq(1636992000);
  });

  it('settlers can mint prophets for free', async function () {
    for (let i = 0; i < settlers.length; i++) {
      proof = settlersTree.getHexProof(hashUser(settlers[i].address));
      await arrival.connect(settlers[i]).mintProphet(proof);

      expect(await nft.balanceOf(settlers[i].address)).to.eq(1);
      expect(await nft.ownerOf(i + 1)).to.eq(settlers[i].address);
    }
  });

  it('firsts can mint prophets for 0.25 ETH', async function () {
    for (let i = 0; i < firsts.length; i++) {
      proof = firstsTree.getHexProof(hashUser(firsts[i].address));
      await arrival.connect(firsts[i]).mintProphet(proof, { value: unit(0.25), gasPrice: 0 });

      expect(await nft.balanceOf(firsts[i].address)).to.eq(1);
      expect(await nft.ownerOf(i + 1 + settlers.length)).to.eq(firsts[i].address);
    }
  });

  it('second round is open at Nov 16', async function () {
    await setTime(SECOND_ROUND_TS);
    expect(await arrival.secondRoundTS()).to.eq(1637078400);
  });

  it('seconds can mint prophets for 0.25 ETH', async function () {
    for (let i = 0; i < seconds.length; i++) {
      proof = secondsTree.getHexProof(hashUser(seconds[i].address));
      await arrival.connect(seconds[i]).mintProphet(proof, { value: unit(0.25), gasPrice: 0 });

      expect(await nft.balanceOf(seconds[i].address)).to.eq(1);
      expect(await nft.ownerOf(i + 1 + settlers.length + firsts.length)).to.eq(seconds[i].address);
    }
  });

  it('public round is open at Nov 17', async function () {
    await setTime(THIRD_ROUND_TS);
    expect(await arrival.thirdRoundTS()).to.eq(1637164800);
  });

  it('public can mint prophets for 0.25 ETH', async function () {
    for (let i = 0; i < public.length; i++) {
      await arrival.connect(public[i]).mintProphet([HASH_ZERO], { value: unit(0.25), gasPrice: 0 });

      expect(await nft.balanceOf(public[i].address)).to.eq(1);
      expect(await nft.ownerOf(i + 1 + settlers.length + firsts.length + seconds.length)).to.eq(public[i].address);
    }
  });

  it('event is over at Nov 19', async function () {
    await setTime(EVENT_ENDS_TS);
    expect(await arrival.eventEndsTS()).to.eq(1637366400);
  });

  it('all the ETH is received by Arrival', async function () {
    expect(await ethers.provider.getBalance(arrival.address)).to.eq(
      unit(0.25).mul(settlers.length + firsts.length + seconds.length),
    );
  });

  it('withdraw ETH to Treasury', async function () {
    await arrival.connect(owner).withdrawAll();
    expect(await ethers.provider.getBalance(TREASURY)).to.eq(
      unit(0.25).mul(settlers.length + firsts.length + seconds.length),
    );
  });

  it('can mint greats by submitted sigs', async function () {
    greats = await getWallets(GREAT_NUM, 0.1);
    for (let i = 0; i < greats.length; i++) {
      const price = await arrival.getStartingPrice(PROPHETS_NUM + 1 + i);
      await wethToken.connect(owner).transfer(greats[i].address, price);
      await wethToken.connect(greats[i]).approve(arrival.address, price);

      const sig = await getBidSig(greats[i], arrival.address, price, 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1 + i, price, price, 1, sig.v, sig.r, sig.s);

      expect(await nft.balanceOf(greats[i].address)).to.eq(1);
      expect(await nft.ownerOf(PROPHETS_NUM + 1 + i)).to.eq(greats[i].address);
    }
  });

  it('all the WETH is received at Treasury', async function () {
    expect(await wethToken.balanceOf(TREASURY)).to.eq(unit(1500));
  });

  it('all prophets can claim loot', async function () {
    for (let i = 0; i < settlers.length; i++) {
      await nft.connect(settlers[i]).claimLoot(i + 1, { gasPrice: 0 });
      expect(await bablToken.balanceOf(settlers[i].address)).to.eq((await nft.getAttributes(i + 1)).bablLoot);
    }

    for (let i = 0; i < firsts.length; i++) {
      await nft.connect(firsts[i]).claimLoot(settlers.length + i + 1, { gasPrice: 0 });
      expect(await bablToken.balanceOf(firsts[i].address)).to.eq(
        (await nft.getAttributes(settlers.length + i + 1)).bablLoot,
      );
    }

    for (let i = 0; i < seconds.length; i++) {
      await nft.connect(seconds[i]).claimLoot(settlers.length + firsts.length + i + 1, { gasPrice: 0 });
      expect(await bablToken.balanceOf(seconds[i].address)).to.eq(
        (await nft.getAttributes(settlers.length + firsts.length + i + 1)).bablLoot,
      );
    }

    for (let i = 0; i < public.length; i++) {
      await nft.connect(public[i]).claimLoot(settlers.length + firsts.length + seconds.length + i + 1, { gasPrice: 0 });
      expect(await bablToken.balanceOf(settlers[i].address)).to.eq(
        (await nft.getAttributes(settlers.length + firsts.length + seconds.length + i + 1)).bablLoot,
      );
    }

    for (let i = 0; i < greats.length; i++) {
      await nft.connect(greats[i]).claimLoot(PROPHETS_NUM + i + 1, { gasPrice: 0 });
      expect(await bablToken.balanceOf(greats[i].address)).to.eq(
        (await nft.getAttributes(PROPHETS_NUM + i + 1)).bablLoot,
      );
    }
  });
});
