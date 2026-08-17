import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";

import { network } from "hardhat";

const TOTAL_SUPPLY = parseEther("250000000");
// A fixed, throwaway treasury address for tests (the real one is set at
// deploy). All-lowercase on purpose: viem accepts lowercase addresses as-is
// but rejects mixed case that doesn't match the EIP-55 checksum.
const TREASURY = "0x0000000000000000000000000000000000007ea5";

/** 2% of `amount`, exactly as the contract computes it. */
function fee(amount: bigint): bigint {
  return (amount * 200n) / 10_000n;
}

describe("HopeCoin", async function () {
  const { viem } = await network.create();

  it("mints the full fixed supply to the deployer", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);
    const [deployer] = await viem.getWalletClients();

    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
    assert.equal(
      await token.read.balanceOf([deployer.account.address]),
      TOTAL_SUPPLY,
    );
  });

  it("has the expected metadata", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);

    assert.equal(await token.read.name(), "Hope Coin");
    assert.equal(await token.read.symbol(), "HOPE");
    assert.equal(await token.read.decimals(), 18);
  });

  it("takes a fixed 2% fee to the treasury on every transfer", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);
    const [, recipient] = await viem.getWalletClients();
    const amount = parseEther("1000");

    await token.write.transfer([recipient.account.address, amount]);

    assert.equal(
      await token.read.balanceOf([recipient.account.address]),
      amount - fee(amount),
    );
    assert.equal(await token.read.balanceOf([TREASURY]), fee(amount));
    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
  });

  it("exposes the fee rate and treasury as unchangeable views", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);

    assert.equal(await token.read.FEE_BPS(), 200n);
    assert.equal(
      (await token.read.treasury()).toLowerCase(),
      TREASURY.toLowerCase(),
    );
  });

  it("renounces ownership to the zero address", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);

    await token.write.renounceOwnership();

    assert.equal(
      BigInt(await token.read.owner()),
      0n,
    );
  });

  it("reverts when transferring more than the sender's balance", async function () {
    const token = await viem.deployContract("HopeCoin", [TREASURY]);
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
