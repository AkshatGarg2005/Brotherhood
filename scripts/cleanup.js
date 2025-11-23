const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const serviceAccount = require('../serviceAccountKey.json'); // Path to your downloaded key

// 1. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 2. Initialize Cloudinary
cloudinary.config({ 
  cloud_name: 'dcwb367nv', 
  api_key: '815996252476884', 
  api_secret: '2Ior6fJLboHjF8htwvSIshn637Y',
  secure: true
});

// 3. The Cleanup Function
const deleteOldData = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - (72 * 60 * 60 * 1000)); // 72 Hours ago
  console.log(`Deleting data older than: ${cutoff.toISOString()}`);

  // --- A. CLEAN GLOBAL MESSAGES ---
  const globalSnapshot = await db.collection('global_messages')
    .where('createdAt', '<', cutoff)
    .get();

  await processDeletion(globalSnapshot, 'Global Chat');

  // --- B. CLEAN PRIVATE CHATS ---
  // Note: In Firestore, messages are subcollections. 
  // This requires a "Collection Group" query.
  const privateSnapshot = await db.collectionGroup('messages')
    .where('createdAt', '<', cutoff)
    .get();

  await processDeletion(privateSnapshot, 'Private Chats');
};

const processDeletion = async (snapshot, context) => {
  if (snapshot.empty) {
    console.log(`[${context}] No old messages found.`);
    return;
  }

  let deletedCount = 0;
  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // 1. Delete from Cloudinary if attachment exists
    if (data.attachment && data.attachment.url) {
      try {
        // Extract public_id from URL
        // Example: .../upload/v12345/brotherhood_uploads/filename.jpg
        const urlParts = data.attachment.url.split('/');
        const fileName = urlParts.pop().split('.')[0]; // remove extension
        const folder = "brotherhood_uploads"; // Assuming you used a preset with this folder
        const publicId = urlParts.includes(folder) ? `${folder}/${fileName}` : fileName;

        // Determine resource type (image or raw for pdfs)
        const resourceType = data.attachment.type?.startsWith('image') ? 'image' : 'raw';

        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Deleted Cloudinary file: ${publicId}`);
      } catch (err) {
        console.error("Cloudinary Error:", err.message);
      }
    }

    // 2. Delete from Firestore
    batch.delete(doc.ref);
    deletedCount++;
  }

  await batch.commit();
  console.log(`[${context}] Deleted ${deletedCount} messages.`);
};

deleteOldData();