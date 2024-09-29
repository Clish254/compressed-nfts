import "dotenv/config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import fs from "fs";

const keypairData = JSON.parse(fs.readFileSync("keypair.json", "utf-8"));
const secret = new Uint8Array(keypairData);

const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
  throw new Error("RPC_URL environment variable is missing");
}
export const umi = createUmi(rpcUrl)
  .use(mplBubblegum())
  .use(mplTokenMetadata())
  .use(irysUploader()); // Use the Irys uploader for metadata uploads

const myKeypair = umi.eddsa.createKeypairFromSecretKey(secret);

umi.use(keypairIdentity(myKeypair));
