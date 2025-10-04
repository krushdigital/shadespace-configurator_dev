import mongoose from "mongoose";
const shopSchema = mongoose.Schema({}, { strict: false });

const ShopifySession = mongoose.models.shopify_sessions || mongoose.model("shopify_sessions", shopSchema);

export default ShopifySession