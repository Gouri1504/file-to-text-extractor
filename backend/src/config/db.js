// config/db.js
// MongoDB connection plus a lazy GridFSBucket accessor.
// We expose getBucket() (not a bucket constant) because the underlying
// connection.db is only available AFTER mongoose has connected, so we
// build the bucket on first use.

import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dns from 'dns';
import env from './env.js';

// Some dev machines have a stale "127.0.0.1" entry in their DNS resolver
// config (left behind by Pi-hole / VPN / security tools), which makes
// Node's resolver fail with ECONNREFUSED on every lookup - including the
// SRV lookups Atlas requires. If we detect that, override Node's resolver
// with public DNS so Atlas connection strings (especially mongodb+srv://)
// keep working.
const nodeDnsServers = dns.getServers();
const onlyLoopback = nodeDnsServers.every((s) => s === '127.0.0.1' || s === '::1');
if (onlyLoopback) {
  // Cloudflare + Google as fallbacks. IPv4 only - IPv6 in this list would
  // be tried first on dual-stack machines and many home networks block it.
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  console.warn('DNS: only loopback resolvers configured; overriding with 1.1.1.1, 8.8.8.8');
}

let bucket = null;

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

export const getBucket = () => {
  if (!bucket) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('GridFS requested before MongoDB connected');
    }
    // Bucket name "uploads" gives collections uploads.files and uploads.chunks.
    bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  }
  return bucket;
};
