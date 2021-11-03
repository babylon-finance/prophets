const { expect } = require('chai');
const fs = require('fs');
const { onlyFull } = require('../lib/test-helpers');
const { unit, setTime, takeSnapshot, restoreSnapshot, getBidSig, ZERO_ADDRESS } = require('../lib/helpers');

// Monday, 15 November 2021, 8:00:00 AM in Timezone (GMT -8:00) Pacific Time (US & Canada)
const EVENT_STARTS_TS = 1636992000;
const SECOND_ROUND_TS = EVENT_STARTS_TS + 24 * 3600;
const THIRD_ROUND_TS = SECOND_ROUND_TS + 24 * 3600;
const EVENT_ENDS_TS = THIRD_ROUND_TS + 86400 * 2 + 8 * 3600;
const PROPHETS_NUM = 8000;

describe('ProphetsArrival', () => {
  let deployer;
  let ramon;
  let tyler;
  let minter;
  let owner;
  let nft;
  let arrival;
  let prophets;
  let great;
  let bablToken;
  let wethToken;
  let snapshotId;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    great = prophets.slice(8000);
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();

    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

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

    await arrival.connect(owner).addUsersToWhitelist([ramon.address], [ramon.address], [ramon.address]);

    await wethToken.connect(ramon).approve(arrival.address, unit(1e10));
    await wethToken.connect(owner).transfer(ramon.address, unit(1e3));
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotId);
  });

  /* ============ Constructor ============ */

  describe('constructor ', function () {
    it('does NOT allow 0x0 NFT', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(ZERO_ADDRESS, wethToken.address, 1636992000)).to.revertedWith(
        '0x0 NFT address',
      );
    });

    it('does NOT allow 0x0 weth', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(nft.address, ZERO_ADDRESS, 1636992000)).to.revertedWith('0x0 WETH address');
    });

    it('does NOT allow even int the past', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(nft.address, ZERO_ADDRESS, 636992000)).to.revertedWith(
        'Event should start in the future',
      );
    });
  });

  /* ============ External Write Functions ============ */

  describe('withdrawAll', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can withdraw runds after event ends', async function () {
      await arrival.connect(ramon).mintProphet({ value: unit(0.25) });

      await setTime(EVENT_ENDS_TS);

      await arrival.connect(owner).withdrawAll();
    });

    it('can NOT withdraw if no funds', async function () {
      await setTime(EVENT_ENDS_TS);

      await expect(arrival.connect(owner).withdrawAll()).to.revertedWith('No funds');
    });

    it('can NOT withdraw if event is not over', async function () {
      await expect(arrival.connect(owner).withdrawAll()).to.revertedWith('Event is not over');
    });
  });

  describe('mintGreat', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('owner can mint a great prophet', async function () {
      await setTime(EVENT_ENDS_TS);

      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), 1, sig.v, sig.r, sig.s);
      expect(await wethToken.balanceOf('0xD7AAf4676F0F52993cb33aD36784BF970f0E1259')).to.eq(unit());
    });

    it('fails if sig is corrupted', async function () {
      await setTime(EVENT_ENDS_TS);

      const sig = await getBidSig(ramon, arrival.address, 100, 1);
      await expect(arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, 1, 1, sig.v, sig.r, sig.s)).to.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('fails if bid is too low', async function () {
      await setTime(EVENT_ENDS_TS);
      await nft.connect(owner).setProphetsAttributes([PROPHETS_NUM + 1], [unit(5)], [0], [0], [0], [0]);
      const sig = await getBidSig(ramon, arrival.address, 1, 1);
      await expect(arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, 1, 1, sig.v, sig.r, sig.s)).to.revertedWith(
        'Bid is too low',
      );
    });

    it('fails if nonce is too low', async function () {
      await setTime(EVENT_ENDS_TS);

      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), 1, sig.v, sig.r, sig.s);
      await expect(arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), 1, sig.v, sig.r, sig.s)).to.revertedWith(
        'Nonce is too low',
      );
    });
  });

  describe('mintProphet', function () {
    it('can mint a prophet', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet();

      expect(await nft.balanceOf(ramon.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
    });

    it('can be in the first round to mint', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(owner).addUsersToWhitelist([], [tyler.address], []);
      await arrival.connect(tyler).mintProphet({ value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
      expect(await ethers.provider.getBalance(arrival.address)).to.eq(unit(0.25));
    });

    it('can be in the second round to mint', async function () {
      await setTime(SECOND_ROUND_TS);

      await arrival.connect(owner).addUsersToWhitelist([], [], [tyler.address]);
      await arrival.connect(tyler).mintProphet({ value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
    });

    it('anyone can mint in the third round', async function () {
      await setTime(THIRD_ROUND_TS);

      await arrival.connect(tyler).mintProphet({ value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
    });

    it('can to be a settler to mint', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet();

      expect(await nft.balanceOf(ramon.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
    });

    it('have to pay 0.25 ETH for a prophet', async function () {
      await setTime(THIRD_ROUND_TS);

      await expect(arrival.connect(tyler).mintProphet()).to.revertedWith('msg.value has to be 0.25');
    });

    it('can mint only one prophet per wallet', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet();

      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('User can only mint 1 prophet');
    });

    it.skip('can mint all prophets', async function () {
      await setTime(EVENT_STARTS_TS);

      const wallets = [];
      for (let i = 0; i < PROPHETS_NUM; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        wallets.push(wallet);
        await deployer.sendTransaction({
          to: wallet.address,
          value: unit(0.25),
        });
      }

      await arrival.connect(owner).addUsersToWhitelist(
        [],
        wallets.map((w) => w.address),
        [],
      );

      for (let i = 0; i < PROPHETS_NUM; i++) {
        await arrival.connect(wallets[i]).mintProphet({ value: unit(0.25), gasPrice: 0 });

        expect(await nft.balanceOf(wallets[i].address)).to.eq(1);
        expect(await nft.ownerOf(i + 1)).to.eq(wallets[i].address);
      }

      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('All prophets are minted');
    });

    it('can NOT mint if event has not started yet', async function () {
      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('Event is not open');
    });

    it('can NOT mint if event is over', async function () {
      await setTime(EVENT_ENDS_TS);

      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('Event is not open');
    });

    it('can NOT mint if not whitelisted', async function () {
      await setTime(EVENT_STARTS_TS);

      await expect(arrival.connect(tyler).mintProphet({ value: unit(0.25) })).to.revertedWith('User not whitelisted');
    });
  });

  describe('addUsersToWhitelist', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can whitelist a user', async function () {
      await arrival.connect(owner).addUsersToWhitelist([tyler.address], [tyler.address], [tyler.address]);

      expect(await arrival.settlerWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.firstRoundWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.secondRoundWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.mintedProphet(tyler.address)).to.eq(false);
    });
  });

  /* ============ External View Functions ============ */

  describe('getStartingPrice', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('gets starting price for prophet', async function () {
      await arrival.connect(ramon).mintProphet();
      expect(await arrival.getStartingPrice(1)).to.eq(unit((0.05 * 40000) / PROPHETS_NUM));
    });
  });
});
