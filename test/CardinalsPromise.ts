import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";

import { network } from "hardhat";

const TOTAL_SUPPLY = parseEther("1000000000");

describe("CardinalsPromise v2", async function () {
  const { viem } = await network.create();

  async function fixture() {
    const [admin, treasury, member, member2, merchant, outsider] =
      await viem.getWalletClients();
    const token = await viem.deployContract("CardinalsPromise", [
      treasury.account.address,
      admin.account.address,
    ]);

    await token.write.setMember([member.account.address, true], {
      account: admin.account,
    });
    await token.write.setMember([member2.account.address, true], {
      account: admin.account,
    });
    await token.write.setMerchant([merchant.account.address, true], {
      account: admin.account,
    });

    return { token, admin, treasury, member, member2, merchant, outsider };
  }

  it("mints the full fixed supply to the treasury", async function () {
    const { token, treasury } = await fixture();
    assert.equal(await token.read.totalSupply(), TOTAL_SUPPLY);
    assert.equal(await token.read.balanceOf([treasury.account.address]), TOTAL_SUPPLY);
  });

  it("has the expected metadata", async function () {
    const { token } = await fixture();
    assert.equal(await token.read.name(), "Cardinals Promise");
    assert.equal(await token.read.symbol(), "CARD");
    assert.equal(await token.read.decimals(), 18);
  });

  it("allows treasury distribution to an approved member", async function () {
    const { token, treasury, member } = await fixture();
    const amount = parseEther("1000");
    await token.write.transfer([member.account.address, amount], {
      account: treasury.account,
    });
    assert.equal(await token.read.balanceOf([member.account.address]), amount);
  });

  it("allows an approved member to spend at an approved merchant", async function () {
    const { token, treasury, member, merchant } = await fixture();
    const amount = parseEther("1000");
    await token.write.transfer([member.account.address, amount], {
      account: treasury.account,
    });
    await token.write.transfer([merchant.account.address, amount], {
      account: member.account,
    });
    assert.equal(await token.read.balanceOf([merchant.account.address]), amount);
  });

  it("rejects member-to-member transfers", async function () {
    const { token, treasury, member, member2 } = await fixture();
    await token.write.transfer([member.account.address, parseEther("10")], {
      account: treasury.account,
    });

    await viem.assertions.revertWithCustomError(
      token.write.transfer([member2.account.address, 1n], { account: member.account }),
      token,
      "TransferNotPermitted",
    );
  });

  it("rejects transfers to arbitrary addresses", async function () {
    const { token, treasury, member, outsider } = await fixture();
    await token.write.transfer([member.account.address, parseEther("10")], {
      account: treasury.account,
    });

    await viem.assertions.revertWithCustomError(
      token.write.transfer([outsider.account.address, 1n], { account: member.account }),
      token,
      "TransferNotPermitted",
    );
  });

  it("transferFrom cannot bypass the destination rules", async function () {
    const { token, treasury, member, member2 } = await fixture();
    await token.write.transfer([member.account.address, parseEther("10")], {
      account: treasury.account,
    });
    await token.write.approve([member2.account.address, 10n], {
      account: member.account,
    });

    await viem.assertions.revertWithCustomError(
      token.write.transferFrom([member.account.address, member2.account.address, 10n], {
        account: member2.account,
      }),
      token,
      "TransferNotPermitted",
    );
  });

  it("pause stops pilot transfers", async function () {
    const { token, admin, treasury, member } = await fixture();
    await token.write.pause({ account: admin.account });

    await viem.assertions.revert(
      token.write.transfer([member.account.address, 1n], { account: treasury.account }),
    );
  });

  it("has no zero-address treasury", async function () {
    const [admin] = await viem.getWalletClients();
    await viem.assertions.revert(
      viem.deployContract("CardinalsPromise", [zeroAddress, admin.account.address]),
    );
  });
});
