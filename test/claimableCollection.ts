import { expect } from "chai";
import { ethers } from "hardhat";
import axios from "axios";

type HeroLandMap = {
  Beach: string;
  Castle: string;
  Desert: string;
  "Green Forest": string;
  Grove: string;
  Montains: string;
  Plains: string;
  "Snow Montains": string;
};

describe("ClaimableCollection", function () {
  let claimableCollection: any;
  let baseCollection: any; // rytell heros
  let owner: any;
  let landClaimers: any[];

  this.beforeEach(async function () {
    [owner, ...landClaimers] = await ethers.getSigners();

    const RytellCollection = await ethers.getContractFactory("Rytell");
    baseCollection = await RytellCollection.deploy(
      "ipfs://QmXHJfoMaDiRuzgkVSMkEsMgQNAtSKr13rtw5s59QoHJAm/",
      "ipfs://Qmdg8GAFvo2BFNiXA3oCTH34cLojQUrbLL6yGYZHaKFSHm/hidden.json",
      owner.address
    );
    await baseCollection.deployed();

    // unpause it
    await baseCollection.pause(false);
    // reveal
    await baseCollection.reveal();
    // mint some
    await baseCollection
      .connect(landClaimers[0])
      .mint(5, { value: ethers.utils.parseEther("12.5") });

    const ClaimableCollection = await ethers.getContractFactory(
      "ClaimableCollection"
    );
    claimableCollection = await ClaimableCollection.deploy(
      "ipfs://QmVvpF887BE1h5rojcxg8aZC6yrtc5Q5oNeqfwnEzy2KPa/",
      baseCollection.address
    );
    await claimableCollection.deployed();
  });

  it("Land claimer should have at least a hero", async function () {
    const landClaimerHeroBalance = await baseCollection.balanceOf(
      landClaimers[0].address
    );
    expect(landClaimerHeroBalance.toNumber()).to.equal(5);
  });

  it("Should let hero owners to claim lands", async function () {
    const heroNumbers = await baseCollection.walletOfOwner(
      landClaimers[0].address
    );
    await expect(
      claimableCollection.connect(landClaimers[0]).mint(heroNumbers[0])
    ).not.to.be.reverted;

    expect(await claimableCollection.heroLand(heroNumbers[0])).to.equal(
      heroNumbers[0]
    );
  });

  it("Should not let a hero owner claim twice for same hero", async function () {
    const heroNumbers = await baseCollection.walletOfOwner(
      landClaimers[0].address
    );

    // claim a first time
    await expect(
      claimableCollection.connect(landClaimers[0]).mint(heroNumbers[0])
    ).not.to.be.reverted;

    // claim a second time
    await expect(
      claimableCollection.connect(landClaimers[0]).mint(heroNumbers[0])
    ).to.be.revertedWith("This hero has already claimed a land");
  });

  it("Metadata background for hero and a proper trait type should match", async function () {
    const heroNumbers = await baseCollection.walletOfOwner(
      landClaimers[0].address
    );

    // claim a land for each hero
    await Promise.all(
      heroNumbers.map(
        async (heroNumber: any) =>
          await claimableCollection.connect(landClaimers[0]).mint(heroNumber)
      )
    );

    const landNumbers = await claimableCollection.walletOfOwner(
      landClaimers[0].address
    );

    for (let index = 0; index < heroNumbers.length; index++) {
      expect(heroNumbers[index].toString()).to.equal(
        landNumbers[index].toString()
      );
    }

    const metaDataToCompare: { hero: any[]; land: any[] }[] = await Promise.all(
      heroNumbers.map(async (heroNumber: any) => {
        const { data: heroMeta } = await axios.get(
          `https://rytell.mypinata.cloud/ipfs/QmXHJfoMaDiRuzgkVSMkEsMgQNAtSKr13rtw5s59QoHJAm/${heroNumber.toString()}.json`
        );
        const { data: landMeta } = await axios.get(
          `https://rytell.mypinata.cloud/ipfs/QmVvpF887BE1h5rojcxg8aZC6yrtc5Q5oNeqfwnEzy2KPa/${heroNumber.toString()}.json`
        );

        return {
          hero: heroMeta.attributes,
          land: landMeta.attributes,
        };
      })
    );

    const backgroundLandsMap: HeroLandMap = {
      Beach: "Island",
      Castle: "Castle",
      Desert: "Desert",
      "Green Forest": "Forest",
      Grove: "Marred Grove",
      Montains: "Mountain",
      Plains: "Plains",
      "Snow Montains": "Snow",
    };

    expect(
      metaDataToCompare.every((heroLand: { hero: any[]; land: any[] }) => {
        const heroBackground = heroLand.hero.find(
          // eslint-disable-next-line camelcase
          (attribute: { trait_type: string; value: string }) =>
            attribute.trait_type === "Background"
        ).value as
          | "Beach"
          | "Castle"
          | "Desert"
          | "Grove"
          | "Montains"
          | "Plains"
          | "Green Forest"
          | "Snow Montains";
        const landAttrs = heroLand.land;
        return landAttrs.find(
          // eslint-disable-next-line camelcase
          (attribute: { trait_type: string; value: string }) =>
            attribute.trait_type === backgroundLandsMap[heroBackground]
        );
      })
    ).to.equal(true);
  });
});