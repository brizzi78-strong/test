import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";

import { network } from "hardhat";

const TOTAL_SUPPLY = parseEther("250000000");

describe("CardinalsPromise", async function () {
  const { viem } = await network.create();

  it("mints the full fixed supply to the deployer", async function () {
    const token = await viem.deployContract("CardinalsPromise");
    const [deployer] = await viem.getWalletClients();

    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
    assert.equal(
      await token.read.balanceOf([deployer.account.address]),
      TOTAL_SUPPLY,
    );
  });

  it("has the expected metadata", async function () {
    const token = await viem.deployContract("CardinalsPromise");

    assert.equal(await token.read.name(), "Cardinals Promise");
    assert.equal(await token.read.symbol(), "CARD");
    assert.equal(await token.read.decimals(), 18);
  });

  it("emits Transfer and moves balances", async function () {
    const token = await viem.deployContract("CardinalsPromise");
    const [, recipient] = await viem.getWalletClients();
    const amount = parseEther("1000");

    await viem.assertions.emitWithArgs(
      token.write.transfer([recipient.account.address, amount]),
      token,
      "Transfer",
      [
        (await viem.getWalletClients())[0].account.address,
        recipient.account.address,
        amount,
      ],
    );

    assert.equal(
      await token.read.balanceOf([recipient.account.address]),
      amount,
    );
    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
  });

  it("renounces ownership to the zero address", async function () {
    const token = await viem.deployContract("CardinalsPromise");

    await token.write.renounceOwnership();

    assert.equal(
      BigInt(await token.read.owner()),
      0n,
    );
  });

  it("reverts when transferring more than the sender's balance", async function () {
    const token = await viem.deployContract("CardinalsPromise");
    const [deployer, other] = await viem.getWalletClients();

    await viem.assertions.revertWithCustomError(
      token.write.transfer([deployer.account.address, 1n], {
        account: other.account,
      }),
      token,
      "ERC20InsufficientBalance",
    );
  });
});
