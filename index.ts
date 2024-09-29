import {
  createTree,
  fetchTreeConfigFromSeeds,
  mintToCollectionV1,
} from "@metaplex-foundation/mpl-bubblegum";
import { umi } from "./umi";
import {
  generateSigner,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import fs from "fs";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { base58 } from "@metaplex-foundation/umi/serializers";

const fellowsFile = fs.readFileSync("fellows-keys.json", "utf-8");
const fellows = JSON.parse(fellowsFile);

async function main() {
  console.log("👾 Initializing a Merkle Tree");
  const merkleTreeSigner = generateSigner(umi);
  const builder = await createTree(umi, {
    merkleTree: merkleTreeSigner,
    maxDepth: 14, // Supports up to 16,384 NFTs
    maxBufferSize: 64,
    canopyDepth: 0,
  });

  let { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash();
  await builder.sendAndConfirm(umi, {
    send: { commitment: "finalized" },
    confirm: {
      strategy: { type: "blockhash", blockhash, lastValidBlockHeight },
    },
  });
  let treeFound = false;
  while (!treeFound) {
    try {
      const treeConfig = await fetchTreeConfigFromSeeds(umi, {
        merkleTree: merkleTreeSigner.publicKey,
      });
      treeFound = true;
      console.log(
        `🌲 Merkle Tree created: ${merkleTreeSigner.publicKey.toString()}. Config:`,
      );
      console.log(
        `     - Total Mint Capacity ${Number(treeConfig.totalMintCapacity).toLocaleString()}`,
      );
      console.log(
        `     - Number Minted: ${Number(treeConfig.numMinted).toLocaleString()}`,
      );
      console.log(`     - Is Public: ${treeConfig.isPublic}`);
      console.log(`     - Is Decompressible: ${treeConfig.isDecompressible}`);
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const collectionMetadata = {
    name: "Clish254",
    symbol: "Clish254",
    description: "Clish254 profile cNFT Solana Summer Fellowship 2024",
    seller_fee_basis_points: 500,
    image: "https://avatars.githubusercontent.com/u/29974159?v=4",
    external_url: "https://github.com/Clish254",
    properties: {
      files: [
        {
          uri: "https://avatars.githubusercontent.com/u/29974159?v=4",
          type: "image/png",
        },
      ],
      category: "image",
      creators: [
        {
          address: umi.identity.publicKey.toString(),
          share: 100,
        },
      ],
    },
  };

  console.log("Uploading collection metadata...");
  const collectionMetadataUri =
    await umi.uploader.uploadJson(collectionMetadata);
  console.log("collectionMetadataUri:", collectionMetadataUri);
  console.log("Creating NFT collection...");

  const collectionId = generateSigner(umi);
  await createNft(umi, {
    mint: collectionId,
    name: collectionMetadata.name,
    uri: collectionMetadataUri,
    sellerFeeBasisPoints: percentAmount(5),
    isCollection: true,
  }).sendAndConfirm(umi, {
    send: { commitment: "finalized" },
  });

  console.log(
    "NFT collection created, collection id:",
    collectionId.publicKey.toString(),
  );

  for (const [index, fellow] of fellows.entries()) {
    console.log(`🎨 Minting fellow ${fellow} cNFT`);
    const nftItemJsonObject = {
      name: `${collectionMetadata.name} #${index + 1}`,
      symbol: collectionMetadata.symbol,
      description: collectionMetadata.description,
      seller_fee_basis_points: collectionMetadata.seller_fee_basis_points,
      image: collectionMetadata.image,
      external_url: collectionMetadata.external_url,
      attributes: [
        {
          trait_type: "Github",
          value: "https://github.com/Clish254",
        },
        {
          trait_type: "Twitter",
          value: "https://x.com/clish_illa",
        },
      ],
      properties: {
        files: [
          {
            uri: collectionMetadata.image,
            type: "image/png",
          },
        ],
        category: "image",
        creators: [
          {
            address: umi.identity.publicKey.toString(),
            verified: false,
            share: 100,
          },
        ],
      },
      collection: {
        name: collectionMetadata.name,
        family: "Clish254 Collection",
      },
    };

    const nftItemJsonUri = await umi.uploader.uploadJson(nftItemJsonObject);
    console.log("nftItemJsonUri:", nftItemJsonUri);
    const result = await mintToCollectionV1(umi, {
      leafOwner: publicKey(fellow),
      merkleTree: merkleTreeSigner.publicKey,
      collectionMint: collectionId.publicKey,
      metadata: {
        name: nftItemJsonObject.name,
        symbol: nftItemJsonObject.symbol,
        uri: nftItemJsonUri,
        sellerFeeBasisPoints: collectionMetadata.seller_fee_basis_points,
        collection: { key: collectionId.publicKey, verified: false },
        creators: [
          {
            address: umi.identity.publicKey,
            verified: false,
            share: 100,
          },
        ],
      },
    }).sendAndConfirm(umi, {
      send: {
        commitment: "finalized",
      },
    });
    const b64Sig = base58.deserialize(result.signature)[0];
    console.log(
      `Minted cNFT for fellow ${fellow}, transaction signature: ${b64Sig.toString()}`,
    );
  }
}

main();
