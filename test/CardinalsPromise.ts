import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.getOrCreate();

const UNITS = 10n ** 18n;
const INITIAL_SUPPLY = 100_000_000n * UNITS;
const MAX_SUPPLY = 250_000_000n * UNITS;

describe("CardinalsPromise", function () {
  async function deploy() {
    const [deployer, alice, bob] = await ethers.getSigners();
    const token = await ethers.deployContract("CardinalsPromise", [INITIAL_SUPPLY]);
    return { token, deployer, alice, bob };
  }

  describe("deployment", function () {
    it("sets the ERC-20 metadata", async function () {
      const { token } = await deploy();
      expect(await token.name()).to.equal("Cardinals Promise");
      expect(await token.symbol()).to.equal("CARD");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints the initial supply to the deployer", async function () {
      const { token, deployer } = await deploy();
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
    });

    it("sets the deployer as owner", async function () {
      const { token, deployer } = await deploy();
      expect(await token.owner()).to.equal(deployer.address);
    });

    it("rejects an initial supply above the cap", async function () {
      await expect(
        ethers.deployContract("CardinalsPromise", [MAX_SUPPLY + 1n]),
      ).to.be.revertedWithCustomError(
        { interface: (await ethers.getContractFactory("CardinalsPromise")).interface },
        "MaxSupplyExceeded",
      );
    });
  });

  describe("transfers", function () {
    it("moves tokens between accounts and emits Transfer", async function () {
      const { token, deployer, alice } = await deploy();
      const amount = 1_000n * UNITS;

      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, alice.address, amount);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY - amount);
    });

    it("reverts when the balance is insufficient", async function () {
      const { token, alice, bob } = await deploy();
      await expect(
        token.connect(alice).transfer(bob.address, 1n),
      ).to.be.revertedWithCustomError(token, "InsufficientBalance");
    });

    it("reverts on transfer to the zero address", async function () {
      const { token } = await deploy();
      await expect(
        token.transfer(ethers.ZeroAddress, 1n),
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });
  });

  describe("allowances", function () {
    it("approves and transfers via transferFrom", async function () {
      const { token, deployer, alice, bob } = await deploy();
      const amount = 500n * UNITS;

      await expect(token.approve(alice.address, amount))
        .to.emit(token, "Approval")
        .withArgs(deployer.address, alice.address, amount);

      await token.connect(alice).transferFrom(deployer.address, bob.address, amount);

      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(0n);
    });

    it("does not decrease an infinite allowance", async function () {
      const { token, deployer, alice, bob } = await deploy();
      await token.approve(alice.address, ethers.MaxUint256);
      await token.connect(alice).transferFrom(deployer.address, bob.address, 1n);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(ethers.MaxUint256);
    });

    it("reverts when the allowance is insufficient", async function () {
      const { token, deployer, alice, bob } = await deploy();
      await token.approve(alice.address, 1n);
      await expect(
        token.connect(alice).transferFrom(deployer.address, bob.address, 2n),
      ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
    });
  });

  describe("minting", function () {
    it("lets the owner mint up to the cap", async function () {
      const { token, alice } = await deploy();
      const remaining = MAX_SUPPLY - INITIAL_SUPPLY;

      await token.mint(alice.address, remaining);

      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await token.balanceOf(alice.address)).to.equal(remaining);
    });

    it("reverts when minting past the cap", async function () {
      const { token, alice } = await deploy();
      const remaining = MAX_SUPPLY - INITIAL_SUPPLY;
      await expect(
        token.mint(alice.address, remaining + 1n),
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
    });

    it("reverts when a non-owner mints", async function () {
      const { token, alice } = await deploy();
      await expect(
        token.connect(alice).mint(alice.address, 1n),
      ).to.be.revertedWithCustomError(token, "NotOwner");
    });
  });

  describe("burning", function () {
    it("burns from the caller's balance", async function () {
      const { token, deployer } = await deploy();
      const amount = 100n * UNITS;

      await expect(token.burn(amount))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, ethers.ZeroAddress, amount);

      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
    });

    it("burns via allowance with burnFrom", async function () {
      const { token, deployer, alice } = await deploy();
      const amount = 100n * UNITS;

      await token.approve(alice.address, amount);
      await token.connect(alice).burnFrom(deployer.address, amount);

      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(0n);
    });

    it("reverts when burning more than the balance", async function () {
      const { token, alice } = await deploy();
      await expect(token.connect(alice).burn(1n)).to.be.revertedWithCustomError(
        token,
        "InsufficientBalance",
      );
    });
  });

  describe("ownership", function () {
    it("transfers ownership", async function () {
      const { token, deployer, alice } = await deploy();

      await expect(token.transferOwnership(alice.address))
        .to.emit(token, "OwnershipTransferred")
        .withArgs(deployer.address, alice.address);

      expect(await token.owner()).to.equal(alice.address);
      await token.connect(alice).mint(alice.address, 1n);
    });

    it("renounces ownership and freezes minting", async function () {
      const { token, deployer } = await deploy();

      await token.renounceOwnership();

      expect(await token.owner()).to.equal(ethers.ZeroAddress);
      await expect(
        token.mint(deployer.address, 1n),
      ).to.be.revertedWithCustomError(token, "NotOwner");
    });

    it("reverts ownership actions from non-owners", async function () {
      const { token, alice } = await deploy();
      await expect(
        token.connect(alice).transferOwnership(alice.address),
      ).to.be.revertedWithCustomError(token, "NotOwner");
    });
  });
});
