import { sendMicrosoftEmail } from "../config/microsoft-mailer";

export const action = async ({ request }) => {
  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed." }),
        { status: 405 }
      );
    }

    const data = await request.json();
    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: "Provide all required fields." }),
        { status: 400 }
      );
    }

    const {
      email: receiver,
      pdf,
      edgeType,
      corners,
      currency,
      totalPrice,
      selectedFabric,
      selectedColor,
      warranty,
      edgeMeasurements,
      diagonalMeasurementsObj,
      anchorPointMeasurements,
      Wire_Thickness,
      Area,
      Perimeter,
      canvasImage,
    } = data;

    const renderRow = (label, value, bold = false) => {
      if (!value) return "";
      return `
        <tr>
          <td style="font-weight:${bold ? "bold" : "normal"}; width:40%;">${label}</td>
          <td>${value}</td>
        </tr>
      `;
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /><title>Configuration Summary</title></head>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f3f3f3;">
          <table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:20px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff; border:1px solid #ddd; border-radius:8px;">
                  <tr>
                    <td style="text-align:center; padding:20px;">
                      <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550" style="max-width:200px;" />
                    </td>
                  </tr>
                  <tr><td style="background-color:#232f3e; color:#fff; padding:16px 20px; font-size:18px; font-weight:bold;">Your Custom Shade Sail Configuration</td></tr>
                  <tr><td style="padding:20px; font-size:14px;">Hello,<br/><br/>Thank you for configuring your custom shade sail with us. Here are your details:</td></tr>
                  <tr>
                    <td style="padding:0 20px 20px 20px;">
                      <table cellpadding="8" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; font-size:14px;">
                        <tr><th colspan="2" style="text-align:left; font-size:16px; border-bottom:1px solid #ddd;">Configuration Summary</th></tr>
                        ${renderRow("Product Name", `Custom ${selectedFabric?.label} Shade Sail - ${selectedColor?.name} - ${corners} Corner`, true)}
                        ${renderRow("Fabric Material", selectedFabric?.label)}
                        ${renderRow("Fabric Color", selectedColor?.name)}
                        ${renderRow("Shade Factor", selectedColor?.shadeFactor ? selectedColor.shadeFactor + "%" : "")}
                        ${renderRow("Edge Type", edgeType)}
                        ${renderRow("Wire Thickness", Wire_Thickness ? Wire_Thickness + '"' : "")}
                        ${renderRow("Corners", corners)}
                        ${renderRow("Area", Area)}
                        ${renderRow("Perimeter", Perimeter)}

                        <tr><th colspan="2" style="text-align:left; font-size:15px; padding-top:20px; border-top:1px solid #ddd;">Precise Measurements</th></tr>

                        ${edgeMeasurements ? Object.keys(edgeMeasurements)
                          .map((key) =>
                            edgeMeasurements[key]?.formatted
                              ? `<tr><td style="font-weight:bold;">${key[0]} → ${key[1]}</td><td>${edgeMeasurements[key].formatted}</td></tr>`
                              : ""
                          ).join("") : ""}

                        ${diagonalMeasurementsObj ? Object.keys(diagonalMeasurementsObj)
                          .map((key) =>
                            diagonalMeasurementsObj[key]?.formatted
                              ? `<tr><td style="font-weight:bold;">${key}</td><td>${diagonalMeasurementsObj[key].formatted}</td></tr>`
                              : ""
                          ).join("") : ""}

                        ${anchorPointMeasurements ? Object.keys(anchorPointMeasurements)
                          .map((key) =>
                            anchorPointMeasurements[key]?.formatted
                              ? `<tr><td style="font-weight:bold;">Anchor Point ${key}</td><td>${anchorPointMeasurements[key].formatted}</td></tr>`
                              : ""
                          ).join("") : ""}

                        ${renderRow("Warranty", warranty ? warranty + " Years" : "")}
                        ${renderRow("Your Shade Sail Price", totalPrice ? `<span style="color:#b12704; font-weight:bold; font-size:16px;">${totalPrice} ${currency}</span>` : "", true)}
                      </table>
                    </td>
                  </tr>
                  ${canvasImage ? `
                    <tr><td style="text-align:center; padding:20px;"><img src="${canvasImage}" style="max-width:100%; border:1px solid #ddd; border-radius:6px;" /></td></tr>
                  ` : ""}
                  <tr><td style="background-color:#f6f6f6; padding:15px; text-align:center; font-size:13px; color:#666;">Thank you for choosing us for your custom shade sail.<br/>We’ll keep you updated about your order status.</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const filename = `Product Summary - Custom ${selectedFabric?.label} Shade Sail - ${selectedColor?.name} - ${corners} Corner.pdf`;

    await sendMicrosoftEmail({
      to: receiver,
      subject: `Your Shade Sail Quote Summary`,
      html: emailHtml,
      pdf,
      filename,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email summary sent to your email." }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      { status: 500 }
    );
  }
};
