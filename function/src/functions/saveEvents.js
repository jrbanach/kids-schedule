const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

app.http("saveEvents", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (req, ctx) => {
    try {
      const events = await req.json();
      if (!Array.isArray(events))
        return { status: 400, body: "Expected JSON array" };

      const client = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      const blob = client
        .getContainerClient("data")
        .getBlockBlobClient("events.json");
      const body = JSON.stringify(events);
      await blob.upload(body, Buffer.byteLength(body), {
        overwrite: true,
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
      return { status: 200, body: "OK" };
    } catch (e) {
      ctx.error(e);
      return { status: 500, body: "Error saving events" };
    }
  },
});
