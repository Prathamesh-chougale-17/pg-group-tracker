import { readFile } from "node:fs/promises"
import { MongoClient } from "mongodb"

let uri = process.env.MONGODB_URI
if (!uri) throw new Error("MONGODB_URI is not set")

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
      ].join(","),
    )
  uri += `${separator}tls=true&authSource=admin&replicaSet=atlas-142zca-shard-0`
}

const [candidateNames, phoneNumbers] = await Promise.all([
  readFile(new URL("../admission-candidate-names.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../phone-numbers.json", import.meta.url), "utf8").then(JSON.parse),
])

if (!Array.isArray(candidateNames) || !candidateNames.every((name) => typeof name === "string")) {
  throw new Error("admission-candidate-names.json must contain an array of strings")
}
if (!Array.isArray(phoneNumbers) || !phoneNumbers.every((phone) => typeof phone === "string")) {
  throw new Error("phone-numbers.json must contain an array of strings")
}

const client = new MongoClient(uri)
try {
  const db = client.db("cdac")
  const studentResult = await db.collection("student").bulkWrite(
    candidateNames.map((name, sourceIndex) => ({
      updateOne: {
        filter: { _id: `candidate_name:${sourceIndex}` },
        update: { $setOnInsert: { _id: `candidate_name:${sourceIndex}`, name, sourceIndex } },
        upsert: true,
      },
    })),
    { ordered: true },
  )
  const phoneResult = await db.collection("phone-number").bulkWrite(
    phoneNumbers.map((phoneNumber, sourceIndex) => ({
      updateOne: {
        filter: { _id: `phone_number:${sourceIndex}` },
        update: { $setOnInsert: { _id: `phone_number:${sourceIndex}`, phoneNumber, sourceIndex } },
        upsert: true,
      },
    })),
    { ordered: true },
  )
  console.log(JSON.stringify({
    database: "cdac",
    student: { expected: candidateNames.length, inserted: studentResult.upsertedCount, existing: studentResult.matchedCount },
    "phone-number": { expected: phoneNumbers.length, inserted: phoneResult.upsertedCount, existing: phoneResult.matchedCount },
  }, null, 2))
} finally {
  await client.close()
}
