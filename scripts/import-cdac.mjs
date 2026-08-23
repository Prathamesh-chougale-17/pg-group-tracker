import { readFile } from "node:fs/promises"
import { MongoClient } from "mongodb"

let uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error("MONGODB_URI is not set")
}

// Node's SRV resolver is refused in this Windows environment even though the
// Atlas records resolve normally. Use the equivalent seed list for this cluster.
if (uri.includes("@andy.e65j96g.mongodb.net")) {
  const separator = uri.includes("?") ? "&" : "?"
  uri = uri
    .replace("mongodb+srv://", "mongodb://")
    .replace(
      "andy.e65j96g.mongodb.net",
      [
        "ac-me0ygnb-shard-00-00.e65j96g.mongodb.net:27017",
        "ac-me0ygnb-shard-00-01.e65j96g.mongodb.net:27017",
        "ac-me0ygnb-shard-00-02.e65j96g.mongodb.net:27017",
      ].join(",")
    )
  uri += `${separator}tls=true&authSource=admin&replicaSet=atlas-142zca-shard-0`
}

const [candidateNames, phoneNumbers] = await Promise.all([
  readFile(
    new URL("../admission-candidate-names.json", import.meta.url),
    "utf8"
  ).then(JSON.parse),
  readFile(new URL("../phone-numbers.json", import.meta.url), "utf8").then(
    JSON.parse
  ),
])

const documents = [
  ...candidateNames.map((name, sourceIndex) => ({
    _id: `candidate_name:${sourceIndex}`,
    type: "candidate_name",
    name,
    sourceIndex,
  })),
  ...phoneNumbers.map((phoneNumber, sourceIndex) => ({
    _id: `phone_number:${sourceIndex}`,
    type: "phone_number",
    phoneNumber,
    sourceIndex,
  })),
]

const client = new MongoClient(uri)

try {
  await client.connect()
  const collection = client
    .db(process.env.MONGODB_SOURCE_DB || "test")
    .collection("cdac")
  const existingCount = await collection.countDocuments({
    type: { $in: ["candidate_name", "phone_number"] },
  })
  if (existingCount > 0) {
    console.log(
      `Import skipped: ${existingCount} raw source documents already exist in ${collection.namespace}. No documents were modified.`
    )
    process.exitCode = 0
    return
  }
  const result = await collection.bulkWrite(
    documents.map((document) => ({
      updateOne: {
        filter: { _id: document._id },
        update: { $setOnInsert: document },
        upsert: true,
      },
    }))
  )

  console.log(
    `Imported ${candidateNames.length} names and ${phoneNumbers.length} phone numbers into ${collection.namespace}. ` +
      `Inserted ${result.upsertedCount}; existing documents were not modified.`
  )
} finally {
  await client.close()
}
