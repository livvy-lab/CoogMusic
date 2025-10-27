import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
    });
    const response = await s3.send(command);

    console.log("✅ Connected to S3!");
    console.log("Objects:", response.Contents?.map((obj) => obj.Key));
  } catch (err) {
    console.error("❌ S3 connection failed:", err.message);
  }
})();
