import { utils, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

require('dotenv').config();

export default async function (hre: HardhatRuntimeEnvironment) {
  // The wallet that will deploy the token and the paymaster
  // It is assumed that this wallet already has sufficient funds on zkSync
  // ⚠️ Never commit private keys to file tracking history, or your account could be compromised.

  const wallet = new Wallet(process.env.PRIVATE_KEY);
  // The wallet that will receive ERC20 tokens
  const emptyWallet = Wallet.createRandom();
  console.log(`Empty wallet's address: ${emptyWallet.address}`);
  console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);

  const deployer = new Deployer(hre, wallet);

  // Deploying the ERC20 token
  const erc20Artifact = await deployer.loadArtifact("MyERC20");
  const erc20 = await deployer.deploy(erc20Artifact, ["USDC", "USDC", 18]);
  console.log(`ERC20 address: ${erc20.address}`);

  // Deploying the paymaster
  const paymasterArtifact = await deployer.loadArtifact("MyPaymaster");
  const paymaster = await deployer.deploy(paymasterArtifact, [erc20.address]);
  console.log(`Paymaster address: ${paymaster.address}`);

  // Supplying paymaster with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.03"),
    })
  ).wait();

  // Setting the dAPIs in Paymaster
    const ETHUSDdAPI = "0x28ce555ee7a3daCdC305951974FcbA59F5BdF09b";
    const USDCUSDdAPI = "0x946E3232Cc18E812895A8e83CaE3d0caA241C2AB";
  const setProxy = paymaster.setDapiProxy(USDCUSDdAPI, ETHUSDdAPI)
  await (await setProxy).wait()
  console.log("dAPI Proxies Set!")

  // Deploying the greeting contract
  const greetingContractArtifact = await deployer.loadArtifact("Greeting");
  const oldGreeting = "old greeting"
  const deployGreeting = await deployer.deploy(greetingContractArtifact, [oldGreeting]);
  console.log(`Greeting address: ${deployGreeting.address}`);

  // Supplying the ERC20 tokens to the empty wallet:
  await // We will give the empty wallet 3 units of the token:
  (await erc20.mint(emptyWallet.address, "5000000000000000000000")).wait();

  console.log("Minted 5k mUSDC for the empty wallet");

  console.log(`Done!`);
}