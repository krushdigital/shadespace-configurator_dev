import { authenticate } from "../shopify.server";
import ShopifySession from "../model/shopifySession"; 

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await ShopifySession.findOneAndUpdate(
      { $and: [{ shop }, { id: session.id }] },
      { $set: { scope: current.toString() } },
      {new: true, upsert: true}
    ).lean();
  }

  return new Response();
};
