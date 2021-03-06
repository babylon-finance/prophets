const { ethers, upgrades } = require('hardhat');

const { unit, getPrices, BlockNativePriceProvider } = require('../lib/helpers');

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  console.log('chainId', chainId);

  const url = `https://${chainId === 1 ? 'eth-mainnet' : 'eth-rinkeby'}.alchemyapi.io/v2/${ALCHEMY_KEY}`;

  const deployer =
    chainId !== 31337
      ? new ethers.Wallet(`0x${process.env.DEPLOYER_PRIVATE_KEY}`, new BlockNativePriceProvider(url))
      : (await ethers.getSigners())[0];

  let bablToken;
  if (chainId !== 1) {
    const erc20Factory = await ethers.getContractFactory('ERC20Mock', deployer);
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', deployer.address, unit(1000000));
    console.log(`BABL ${bablToken.address}`);

    if (chainId !== 31337) {
      await bablToken.deployTransaction.wait(6);
    }
  } else {
    bablToken = { address: '0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74' };
  }

  const prophetsFactory = await ethers.getContractFactory('Prophets', deployer);

  nft = await upgrades.deployProxy(prophetsFactory, ['https://www.babylon.finance/api/v1/prophet/'], {
    kind: 'uups',
    constructorArgs: [bablToken.address],
  });
  console.log(`NFT ${nft.address}`);

  if (chainId !== 31337) {
    await nft.deployTransaction.wait(6);

    const impl = await upgrades.erc1967.getImplementationAddress(nft.address);
    await hre.run('verify:verify', {
      contract: 'contracts/Prophets.sol:Prophets',
      address: impl,
      constructorArguments: [bablToken.address],
    });
  }
  if (chainId !== 1) {
    await bablToken.transfer(nft.address, unit(40000));
  }

  let wethToken;
  if (chainId !== 1) {
    const erc20Factory = await ethers.getContractFactory('ERC20Mock', deployer);
    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', deployer.address, unit(1e10));
    console.log(`WETH ${wethToken.address}`);

    if (chainId !== 31337) {
      await wethToken.deployTransaction.wait(6);
    }
  } else {
    wethToken = { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' };
  }

  const arrivalFactory = await ethers.getContractFactory('ProphetsArrival', deployer);
  const block = await ethers.provider.getBlock();
  const arrivalStart = chainId === 1 ? 1636992000 : block.timestamp + 60;
  arrival = await upgrades.deployProxy(arrivalFactory, [], {
    kind: 'uups',
    constructorArgs: [nft.address, wethToken.address, 1636992000],
  });
  console.log(`Arrival ${arrival.address}`);

  if (chainId !== 31337) {
    await arrival.deployTransaction.wait(6);
    const impl = await upgrades.erc1967.getImplementationAddress(arrival.address);
    await hre.run('verify:verify', {
      contract: 'contracts/ProphetsArrival.sol:ProphetsArrival',
      address: impl,
      constructorArguments: [nft.address, wethToken.address, 1636992000],
    });
  }

  await (await nft.setMinter(arrival.address)).wait();

  console.log(`deployed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
