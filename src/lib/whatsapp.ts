export const sendOrderToWhatsApp = (orderData: {
  id: string;
  total: number;
  items: Array<{ name: string; quantity: number; price?: number }>;
  customerName?: string;
  customerPhone?: string;
}) => {
  // Replace with your actual WhatsApp number including the country code (no '+' or spaces), e.g., Pakistan: 923XXXXXXXXX
  const adminPhoneNumber = "923435339830"; 

  // Format the items neatly
  const itemsSummary = orderData.items
    .map((item) => `• ${item.name} (Qty: ${item.quantity})`)
    .join('\n');

  // Construct a professional, clean message template
  const message = `🛍️ *New Order Placed - BM Collection*\n\n` +
    `*Order ID:* #${orderData.id.slice(0, 8)}\n` +
    `*Customer:* ${orderData.customerName || 'N/A'}\n` +
    `*Phone:* ${orderData.customerPhone || 'N/A'}\n` +
    `*Total Amount:* $${orderData.total.toFixed(2)}\n\n` +
    `*Ordered Items:*\n${itemsSummary}\n\n` +
    `Log in to your admin dashboard to view full fulfillment details.`;

  // Encode the text string for a web/mobile URL
  const encodedMessage = encodeURIComponent(message);

  // Open WhatsApp with the pre-filled message
  // Note: On mobile devices, this opens the WhatsApp app automatically. On desktop, it opens WhatsApp Web.
  window.open(`https://wa.me/${adminPhoneNumber}?text=${encodedMessage}`, '_blank');
};