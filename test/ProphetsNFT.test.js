const { expect } = require('chai');
const fs = require('fs');
const { eth } = require('../lib/helpers');

describe('ProphetsNFT', () => {
  let deployer;
  let ramon;
  let tyler;
  let minter;
  let owner;
  let nft;
  let prophets;
  let great;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    great = prophets.slice(8000);
  });

  beforeEach(async function () {
    const prophetsFactory = await ethers.getContractFactory('Prophets');
    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

    nft = await prophetsFactory.deploy();

    await nft.setMinter(minter.address);
    await nft.transferOwnership(owner.address);
  });

  /* ============ External Write Functions ============ */

  describe('mintGreatProphet', function () {
    it('can mint', async function () {
      await nft.connect(minter).mintGreatProphet(ramon.address, 8000);
      expect(await nft.ownerOf(8000)).to.eq(ramon.address);
      expect(await nft.balanceOf(ramon.address)).to.eq(1);
    });

    it('can mint all great prophets', async function () {
      for (let i = 0; i < 1000; i++) {
        await nft.connect(minter).mintGreatProphet(ramon.address, 8000 + i);
        expect(await nft.ownerOf(8000 + i)).to.eq(ramon.address);
        expect(await nft.balanceOf(ramon.address)).to.eq(1 + i);
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

        await nft.connect(owner).setProphetsAttributes(
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
    it('minter can mint to themselves', async function () {
      await nft.connect(minter).mintProphet(deployer.address);
      expect(await nft.balanceOf(deployer.address)).to.equal(1);

      await nft.connect(minter).mintProphet(deployer.address);
      expect(await nft.balanceOf(deployer.address)).to.equal(2);
    });

    it('minter can mint to others', async function () {
      expect(await nft.balanceOf(ramon.address)).to.equal(0);
      expect(await nft.balanceOf(tyler.address)).to.equal(0);

      await nft.connect(minter).mintProphet(ramon.address);
      await nft.connect(minter).mintProphet(tyler.address);

      expect(await nft.balanceOf(ramon.address)).to.equal(1);
      expect(await nft.ownerOf(1)).to.be.equal(ramon.address);
      expect(await nft.balanceOf(tyler.address)).to.equal(1);
      expect(await nft.ownerOf(2)).to.be.equal(tyler.address);
    });

    it('creates the correct tokenURIs', async function () {
      const BASE_URI = 'https://babylon.finance./api/v1/';
      await nft.connect(minter).mintProphet(ramon.address);

      expect(await nft.tokenURI(1)).to.equal(BASE_URI + '1');
    });

    it("others can't mint", async function () {
      await expect(nft.connect(ramon).mintProphet(ramon.address)).to.be.revertedWith('Caller is not the minter');
    });
  });

  describe('setBaseURI', function () {
    it('can set URI', async function () {
      await nft.connect(owner).setBaseURI('url');
      expect(await nft.baseTokenURI()).to.equal('url');
    });
  });

  describe('setMinter', function () {
    it('can set minter', async function () {
      await nft.connect(owner).setMinter(tyler.address);
      expect(await nft.minter()).to.equal(tyler.address);
    });
  });

  describe('claimLoot', function () {
    it('can claim loot', async function () {});
  });

  /* ============ External View Functions ============ */

  describe('symbol', function () {
    it('has correct symbol', async function () {
      expect(await nft.symbol()).to.equal('BPP');
    });
  });

  describe('getProphetAttributes', function () {
    it('can get prophets attributes', async function () {
      await nft.connect(minter).mintProphet(ramon.address);

      const [babl, creator, lp, voter, strategist] = await nft.getProphetAttributes(1);

      expect(babl).to.eq(5);
      expect(creator).to.eq(0);
      expect(lp).to.eq(eth(0.01));
      expect(voter).to.eq(0);
      expect(strategist).to.eq(0);
    });
  });

  describe('maxSupply', function () {
    it('gets the maxSupply', async function () {
      expect(await nft.maxSupply()).to.equal(10000);
    });
  });

  describe('owner', function () {
    it('gets the owner', async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe('totalSupply', function () {
    it('gets correct total supply', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.totalSupply()).to.equal(1);
    });
  });

  describe('prophetsSupply', function () {
    it('gets correct total supply', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.prophetsSupply()).to.equal(1);
    });
  });

  describe('supportsInterface', function () {
    it('supports ERC721', async function () {
      expect(await nft.supportsInterface('0x80ac58cd')).to.eq(true);
    });

    it('supports ERC721Enumerable', async function () {
      expect(await nft.supportsInterface('0x780e9d63')).to.eq(true);
    });
  });

  describe('tokenURI', function () {
    it('gets correct URI', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.tokenURI(1)).to.eq('https://babylon.finance./api/v1/1');
    });
  });
});
