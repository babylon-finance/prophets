const { expect } = require('chai');
const fs = require('fs');
const { eth } = require('../lib/helpers');

describe('ProphetsNFT', () => {
  let deployer;
  let alice;
  let bob;
  let minter;
  let nft;
  let prophets;
  let great;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    great = prophets.slice(8000);
  });

  beforeEach(async function () {
    const prophetsFactory = await ethers.getContractFactory('Prophets');
    [deployer, alice, bob, minter] = await ethers.getSigners();

    nft = await prophetsFactory.deploy();
  });

  describe('symbol', function () {
    it('has correct symbol', async function () {
      expect(await nft.symbol()).to.equal('BPP');
    });
  });

  describe('setBaseURI', function () {
    it('can set URI', async function () {
      await nft.setBaseURI('url');
      expect(await nft.baseTokenURI()).to.equal('url');
    });
  });

  describe('owner', function () {
    it('sets the right owner', async function () {
      expect(await nft.owner()).to.equal(deployer.address);
    });
  });

  describe('totalSupply', function () {
    it('gets correct total supply', async function () {
      await nft.setMinter(minter.address);
      await nft.connect(minter).mintProphet(alice.address);
      expect(await nft.totalSupply()).to.equal(1);
    });
  });

  describe.only('prophetsSupply', function () {
    it('gets correct total supply', async function () {
      await nft.setMinter(minter.address);
      await nft.connect(minter).mintProphet(alice.address);
      expect(await nft.prophetsSupply()).to.equal(1);
    });
  });

  describe('tokenURI', function () {
    it('gets correct URI', async function () {
      await nft.setMinter(minter.address);
      await nft.connect(minter).mintProphet(alice.address);
      expect(await nft.tokenURI(1)).to.eq('https://babylon.finance./api/v1/1');
    });
  });

  describe('mintGreatProphet', function () {
    beforeEach(async () => {
      await nft.setMinter(minter.address);
    });

    it('can mint', async function () {
      await nft.connect(minter).mintGreatProphet(alice.address, 8000);
      expect(await nft.ownerOf(8000)).to.eq(alice.address);
      expect(await nft.balanceOf(alice.address)).to.eq(1);
    });

    it('can mint all great prophets', async function () {
      for (let i = 0; i < 1000; i++) {
        await nft.connect(minter).mintGreatProphet(alice.address, 8000 + i);
        expect(await nft.ownerOf(8000 + i)).to.eq(alice.address);
        expect(await nft.balanceOf(alice.address)).to.eq(1 + i);
      }
    });
  });

  describe('setGreatProphetsAttributes', function () {
    it('can set attributes', async function () {
      // Prophet JSON example
      //{
      //  "gender": "male",
      //  "babl": 5,
      //  "floorPrice": 0.25,
      //  "number": 0,
      //  "lpBonus": 1,
      //  "voterBonus": 0,
      //  "strategistBonus": 0,
      //  "creatorBonus": 0,
      //  "name": "Prophet 0",
      //  "bonusScore": 200
      //},
      for (let i = 0; i < 10; i++) {
        const part = great.slice(i * 100, i * 100 + 100);

        const bablLoots = part.map((p) => eth(p.babl));
        const creatorBonuses = part.map((p) => eth(p.creatorBonus));
        const lpBonuses = part.map((p) => eth(p.lpBonus));
        const voterMultipliers = part.map((p) => eth(p.voterBonus));
        const strategistMultipliers = part.map((p) => eth(p.strategistBonus));

        await nft.setProphetsAttributes(
          Array.from(Array(100).keys(), (n) => 8000 + n + i * 100),
          bablLoots,
          creatorBonuses,
          lpBonuses,
          voterMultipliers,
          strategistMultipliers,
        );
      }

      for (let i = 0; i < 1000; i++) {
        const [babl, creator, lp, voter, strategist] = await nft.getProphetAttributes(8000 + i);
        expect(babl).to.eq(eth(prophets[8000 + i].babl));
        expect(creator).to.eq(eth(prophets[8000 + i].creatorBonus));
        expect(lp).to.eq(eth(prophets[8000 + i].lpBonus));
        expect(voter).to.eq(eth(prophets[8000 + i].voterBonus));
        expect(strategist).to.eq(eth(prophets[8000 + i].strategistBonus));
        // console.log(babl.toString(), creator.toString(), lp.toString(), voter.toString(), strategist.toString());
      }
    });
  });

  describe('mintProphet', function () {
    beforeEach(async () => {
      await nft.setMinter(minter.address);
    });

    it('minter can mint to themselves', async function () {
      await nft.connect(minter).mintProphet(deployer.address);
      expect(await nft.balanceOf(deployer.address)).to.equal(1);

      await nft.connect(minter).mintProphet(deployer.address);
      expect(await nft.balanceOf(deployer.address)).to.equal(2);
    });

    it('minter can mint to others', async function () {
      expect(await nft.balanceOf(alice.address)).to.equal(0);
      expect(await nft.balanceOf(bob.address)).to.equal(0);

      await nft.connect(minter).mintProphet(alice.address);
      await nft.connect(minter).mintProphet(bob.address);

      expect(await nft.balanceOf(alice.address)).to.equal(1);
      expect(await nft.ownerOf(1)).to.be.equal(alice.address);
      expect(await nft.balanceOf(bob.address)).to.equal(1);
      expect(await nft.ownerOf(2)).to.be.equal(bob.address);
    });

    it('creates the correct tokenURIs', async function () {
      const BASE_URI = 'https://babylon.finance./api/v1/';
      await nft.connect(minter).mintProphet(alice.address);

      expect(await nft.tokenURI(1)).to.equal(BASE_URI + '1');
    });

    it("others can't mint", async function () {
      await expect(nft.connect(alice).mintProphet(alice.address)).to.be.revertedWith('Caller is not the minter');
    });
  });
});
