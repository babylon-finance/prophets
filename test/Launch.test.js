const { expect } = require('chai');
const fs = require('fs');
const { onlyFull } = require('../lib/test-helpers');
const { unit, from, setTime, takeSnapshot, restoreSnapshot, getBidSig, ZERO_ADDRESS } = require('../lib/helpers');

// Monday, 15 November 2021, 8:00:00 AM in Timezone (GMT -8:00) Pacific Time (US & Canada)
const EVENT_STARTS_TS = 1636992000;
const SECOND_ROUND_TS = EVENT_STARTS_TS + 24 * 3600;
const THIRD_ROUND_TS = SECOND_ROUND_TS + 24 * 3600;
const EVENT_ENDS_TS = THIRD_ROUND_TS + 86400 * 2 + 8 * 3600;
const PROPHETS_NUM = 8000;
const TREASURY = '0xD7AAf4676F0F52993cb33aD36784BF970f0E1259';

const SETTLERS_NUM = 10;
const firsts_NUM = 10;
const seconds_NUM = 10;
const PUBLIC_NUM = 10;
const GREAT_NUM = 10;

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

    nft = await prophetsFactory.deploy(bablToken.address);

    await nft.transferOwnership(owner.address);
    await bablToken.connect(owner).transfer(nft.address, unit(40000));

    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));

    const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
    arrival = await arrivalFactory.deploy(nft.address, wethToken.address, 1636992000);
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
    firsts = await getWallets(firsts_NUM, 0.25);
    seconds = await getWallets(seconds_NUM, 0.25);
    public = await getWallets(PUBLIC_NUM, 0.25);

    await arrival.connect(owner).addUsersToWhitelist(
      settlers.map((s) => s.address),
      firsts.map((f) => f.address),
      seconds.map((s) => s.address),
    );
  });

  it('event is open at Nov 15', async function () {
    await setTime(EVENT_STARTS_TS);
    expect(await arrival.eventStartsTS()).to.eq(1636992000);
  });

  it('settlers can mint prophets for free', async function () {
    for (let i = 0; i < settlers.length; i++) {
      await arrival.connect(settlers[i]).mintProphet();

      expect(await nft.balanceOf(settlers[i].address)).to.eq(1);
      expect(await nft.ownerOf(i + 1)).to.eq(settlers[i].address);
    }
  });

  it('firsts can mint prophets for 0.25 ETH', async function () {
    for (let i = 0; i < firsts.length; i++) {
      await arrival.connect(firsts[i]).mintProphet({ value: unit(0.25), gasPrice: 0 });

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
      await arrival.connect(seconds[i]).mintProphet({ value: unit(0.25), gasPrice: 0 });

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
      await arrival.connect(public[i]).mintProphet({ value: unit(0.25), gasPrice: 0 });

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
      await wethToken.connect(owner).transfer(greats[i].address, unit());
      await wethToken.connect(greats[i]).approve(arrival.address, unit());

      const sig = await getBidSig(greats[i], arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1 + i, unit(), 1, sig.v, sig.r, sig.s);

      expect(await nft.balanceOf(greats[i].address)).to.eq(1);
      expect(await nft.ownerOf(PROPHETS_NUM + 1 + i)).to.eq(greats[i].address);
    }
  });
});
