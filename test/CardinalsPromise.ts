import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";

import { network } from "hardhat";

const TOTAL_SUPPLY = parseEther("1000000000");

describe("CARD", async function () {
  const { viem } = await network.create();

  async function deploy() {
    const [, treasury] = await viem.getWalletClients();
    const token = await viem.deployContract("CardinalsPromise", [
      treasury.account.address,
    ]);
    return { token, treasury };
  }

  it("mints the full fixed supply to the deployer", async function () {
    const { token } = await deploy();
    const [deployer] = await viem.getWalletClients();

    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
    assert.equal(
      await token.read.balanceOf([deployer.account.address]),
      TOTAL_SUPPLY,
    );
  });

  it("has the expected metadata", async function () {
    const { token, treasury } = await deploy();

    assert.equal(await token.read.name(), "Cardinals Promise");
    assert.equal(await token.read.symbol(), "CARD");
    assert.equal(await token.read.decimals(), 18);
    assert.equal(await token.read.FEE_BPS(), 200n);
    assert.equal(
      (await token.read.treasury()).toLowerCase(),
      treasury.account.address.toLowerCase(),
    );
  });

  it("takes exactly 2% on transfers and sends it to the treasury", async function () {
    const { token, treasury } = await deploy();
    const [, , recipient] = await viem.getWalletClients();
    const amount = parseEther("1000");

    await token.write.transfer([recipient.account.address, amount]);

    assert.equal(
      await token.read.balanceOf([recipient.account.address]),
      parseEther("980"),
    );
    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      parseEther("20"),
    );
    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
  });

  it("exempts treasury transfers so gifts arrive whole", async function () {
    const { token, treasury } = await deploy();
    const [, , recipient] = await viem.getWalletClients();
    const amount = parseEther("1000");

    await token.write.transfer([treasury.account.address, amount]);
    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      amount,
    );

    await token.write.transfer([recipient.account.address, parseEther("400")], {
      account: treasury.account,
    });
    assert.equal(
      await token.read.balanceOf([recipient.account.address]),
      parseEther("400"),
    );
    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      parseEther("600"),
    );
  });

  it("rounds the fee down for transfers below 50 wei", async function () {
    const { token, treasury } = await deploy();
    const [, , recipient] = await viem.getWalletClients();

    await token.write.transfer([recipient.account.address, 49n]);
    assert.equal(await token.read.balanceOf([recipient.account.address]), 49n);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 0n);
  });

  it("leaves balances unchanged on a self-transfer", async function () {
    const { token, treasury } = await deploy();
    const [deployer] = await viem.getWalletClients();
    const before = await token.read.balanceOf([deployer.account.address]);

    await token.write.transfer([deployer.account.address, parseEther("1000")]);
    assert.equal(await token.read.balanceOf([deployer.account.address]), before);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 0n);
  });

  it("renounces ownership to the zero address", async function () {
    const { token } = await deploy();

    await token.write.renounceOwnership();

    assert.equal(
      BigInt(await token.read.owner()),
      0n,
    );
  });

  it("reverts when transferring more than the sender's balance", async function () {
    const { token } = await deploy();
    const [deployer, , other] = await viem.getWalletClients();

    await viem.assertions.revertWithCustomError(
      token.write.transfer([deployer.account.address, 1n], {
        account: other.account,
      }),
      token,
      "ERC20InsufficientBalance",
    );
  });
});
