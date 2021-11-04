const { unit } = require('../lib/helpers');

async function main() {
  [deployer, owner] = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();
  console.log('chainId', chainId);

  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  let bablToken;
  if (chainId !== 1) {
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));
    console.log(`BABL ${bablToken.address}`);

    if (chainId !== 31337) {
      await bablToken.deployTransaction.wait(6);
      await hre.run('verify:verify', {
        address: bablToken.address,
        constructorArguments: ['Babylon Finance', 'BABL', owner.address, unit(1000000)],
      });
    }
  }

  const prophetsFactory = await ethers.getContractFactory('Prophets');

  const nft = await prophetsFactory.deploy(bablToken.address);
  console.log(`NFT ${nft.address}`);

  if (chainId !== 31337) {
    await nft.deployTransaction.wait(6);
    await hre.run('verify:verify', {
      address: nft.address,
      constructorArguments: [bablToken.address],
    });
  }
  await nft.transferOwnership(owner.address);
  await bablToken.connect(owner).transfer(nft.address, unit(40000));

  let wethToken;
  // Rinkeby
  if (chainId !== 1) {
    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));
    console.log(`WETH ${wethToken.address}`);

    if (chainId !== 31337) {
      await wethToken.deployTransaction.wait(6);
      await hre.run('verify:verify', {
        address: wethToken.address,
        constructorArguments: ['Wrapped ETH', 'WETH', owner.address, unit(1e10)],
      });
    }
  }

  const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
  const block = await ethers.provider.getBlock();
  const arrivalStart = chainId === 1 ? 1636992000 : block.timestamp + 60;
  const arrival = await arrivalFactory.deploy(nft.address, wethToken.address, arrivalStart);
  console.log(`Arrival ${arrival.address}`);


  if (chainId !== 31337) {
    await arrival.deployTransaction.wait(6);
    await hre.run('verify:verify', {
      address: arrival.address,
      constructorArguments: [nft.address, wethToken.address, arrivalStart],
    });
  }

  await arrival.transferOwnership(owner.address);
  await nft.connect(owner).setMinter(arrival.address);
  console.log(`deployed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
