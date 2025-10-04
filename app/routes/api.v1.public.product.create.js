import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.public.appProxy(request);

    const shadeData = await request.json();

    const {
      fabricColor,
      edgeType,
      corners,
      area,
      perimeter,
      totalPrice,
      selectedFabric,
      selectedColor,
      canvasImageUrl,
      fixingHeights,
      fixingTypes,
      eyeOrientations,
      // Add these missing variables
      edgeMeasurements = {},
      diagonalMeasurementsObj = {},
      anchorPointMeasurements = {},
      Fabric_Type,
      Edge_Type,
      Wire_Thickness,
      Area,
      Perimeter,
      createdAt,
    } = shadeData;

    const metafieldDefinitions = [
      {
        name: "Fabric Material",
        namespace: "shade_sail",
        key: "fabric_material",
        type: "single_line_text_field",
        description: "The material of the fabric used for the shade sail",
      },
      {
        name: "Fabric Color",
        namespace: "shade_sail",
        key: "fabric_color",
        type: "single_line_text_field",
        description: "The color of the fabric",
      },
      {
        name: "Fabric Certification Type",
        namespace: "shade_sail",
        key: "fabric_certification_type",
        type: "single_line_text_field",
        description:
          "Type of fabric certification (FR Certified or Not FR Certified)",
      },
      {
        name: "Shade Factor",
        namespace: "shade_sail",
        key: "shade_factor",
        type: "number_decimal",
        description: "Percentage of shade provided",
      },
      {
        name: "Edge Type",
        namespace: "shade_sail",
        key: "edge_type",
        type: "single_line_text_field",
        description: "The type of edge finishing",
      },
      {
        name: "Wire Thickness",
        namespace: "shade_sail",
        key: "wire_thickness",
        type: "single_line_text_field",
        description: "Thickness of the wire used",
      },
      {
        name: "Corners",
        namespace: "shade_sail",
        key: "corners",
        type: "number_integer",
        description: "Number of corners on the shade sail",
      },
      {
        name: "Area",
        namespace: "shade_sail",
        key: "area",
        type: "single_line_text_field",
        description: "Total area of the shade sail with unit",
      },
      {
        name: "Perimeter",
        namespace: "shade_sail",
        key: "perimeter",
        type: "single_line_text_field",
        description: "Total perimeter of the shade sail with unit",
      },
      {
        name: "Canvas Image URL",
        namespace: "shade_sail",
        key: "canvas_image_url",
        type: "url",
        description: "Technical drawing of the shade sail",
      },
      {
        name: "Edge Measurements",
        namespace: "shade_sail",
        key: "edge_measurements",
        type: "json",
        description: "Detailed edge measurements of the shade sail",
      },
      {
        name: "Diagonal Measurements",
        namespace: "shade_sail",
        key: "diagonal_measurements",
        type: "json",
        description: "Detailed diagonal measurements of the shade sail",
      },
      {
        name: "Anchor Point Measurements",
        namespace: "shade_sail",
        key: "anchor_point_measurements",
        type: "json",
        description: "Detailed anchor point height measurements",
      },
      {
        name: "Fixing Heights",
        namespace: "shade_sail",
        key: "fixing_heights",
        type: "json",
        description: "Fixing point heights",
      },
      {
        name: "Fixing Types",
        namespace: "shade_sail",
        key: "fixing_types",
        type: "json",
        description: "Types of fixing hardware",
      },
      {
        name: "Eye Orientations",
        namespace: "shade_sail",
        key: "eye_orientations",
        type: "json",
        description: "Orientation of eyelets",
      },
      {
        name: "UV Protection",
        namespace: "shade_sail",
        key: "uv_protection",
        type: "single_line_text_field",
        description: "UV protection level",
      },
      {
        name: "Warranty Years",
        namespace: "shade_sail",
        key: "warranty_years",
        type: "number_integer",
        description: "Warranty period in years",
      },
      {
        name: "Weight per Square Meter",
        namespace: "shade_sail",
        key: "weight_per_sqm",
        type: "number_integer",
        description: "Fabric weight per square meter",
      },
      {
        name: "Created At",
        namespace: "shade_sail",
        key: "created_at",
        type: "date_time",
        description: "When the custom product was created",
      },
    ];

    const definitionMutation = `
           mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
      namespace
      key
      type {
        name
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}`;

    for (const definition of metafieldDefinitions) {
      try {
        const definitionResponse = await admin.graphql(definitionMutation, {
          variables: {
            definition: {
              name: definition.name,
              namespace: definition.namespace,
              key: definition.key,
              type: definition.type,
              ownerType: "PRODUCT",
              description: definition.description,
            },
          },
        });

        const definitionResult = await definitionResponse.json();

        if (
          definitionResult.data?.metafieldDefinitionCreate?.userErrors?.length >
          0
        ) {
          const errors =
            definitionResult.data.metafieldDefinitionCreate.userErrors;
          const takenError = errors.find((error) => error.code === "TAKEN");

          if (takenError) {
            console.log(
              `Metafield definition ${definition.name} already exists - skipping`,
            );
          } else {
            console.warn("Metafield definition creation errors:", errors);
          }
        } else {
          console.log(
            `Successfully created metafield definition: ${definition.name}`,
          );
        }
      } catch (error) {
        console.warn(
          "Error creating metafield definition (may already exist):",
          error,
        );
      }
    }

    const productTitle = `Custom ${selectedFabric.label} Shade Sail - ${selectedColor.name} - ${corners} Corner`;

    const productDescription = `
            <h3>Custom Manufactured Shade Sail</h3>
            <p>${selectedFabric.detailedDescription}</p>
            
            <h4>Specifications:</h4>
            <ul>
                <li><strong>Fabric:</strong> ${selectedFabric.label} (${selectedFabric.weightPerSqm}gsm)</li>
                <li><strong>Color:</strong> ${selectedColor.name}</li>
                <li><strong>UV Protection:</strong> ${selectedFabric.uvProtection}</li>
                <li><strong>Shade Factor:</strong> ${selectedColor.shadeFactor}%</li>
                <li><strong>Area:</strong> ${area}m²</li>
                <li><strong>Perimeter:</strong> ${perimeter}m</li>
                <li><strong>Edge Type:</strong> ${edgeType}</li>
                <li><strong>Corners:</strong> ${corners}</li>
                <li><strong>Warranty:</strong> ${selectedFabric.warrantyYears} years</li>
                <li><strong>Made in:</strong> ${selectedFabric.madeIn}</li>
            </ul>
            
            <h4>Key Benefits:</h4>
            <ul>
                ${selectedFabric.benefits.map((benefit) => `<li>${benefit}</li>`).join("")}
            </ul>
            
            <h4>Best For:</h4>
            <ul>
                ${selectedFabric.bestFor.map((use) => `<li>${use}</li>`).join("")}
            </ul>
            
            <p><strong>Note:</strong> This is a custom manufactured product. Installation not included.</p>
        `;

    // Prepare metafields for additional data
    const metafields = [
      {
        namespace: "shade_sail",
        key: "fabric_material",
        value: selectedFabric?.label || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "fabric_color",
        value: fabricColor,
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "fabric_certification_type",
        value: Fabric_Type || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "shade_factor",
        value: selectedColor?.shadeFactor?.toString() || "",
        type: "number_decimal",
      },
      {
        namespace: "shade_sail",
        key: "edge_type",
        value: Edge_Type || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "wire_thickness",
        value: Wire_Thickness || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "corners",
        value: corners.toString(),
        type: "number_integer",
      },
      {
        namespace: "shade_sail",
        key: "area",
        value: Area || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "perimeter",
        value: Perimeter || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "canvas_image_url",
        value: canvasImageUrl || "",
        type: "url",
      },
      {
        namespace: "shade_sail",
        key: "edge_measurements",
        value: JSON.stringify(edgeMeasurements),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "diagonal_measurements",
        value: JSON.stringify(diagonalMeasurementsObj),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "anchor_point_measurements",
        value: JSON.stringify(anchorPointMeasurements),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "fixing_heights",
        value: JSON.stringify(fixingHeights),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "fixing_types",
        value: JSON.stringify(fixingTypes),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "eye_orientations",
        value: JSON.stringify(eyeOrientations),
        type: "json",
      },
      {
        namespace: "shade_sail",
        key: "uv_protection",
        value: selectedFabric?.uvProtection || "",
        type: "single_line_text_field",
      },
      {
        namespace: "shade_sail",
        key: "warranty_years",
        value: selectedFabric?.warrantyYears?.toString() || "",
        type: "number_integer",
      },
      {
        namespace: "shade_sail",
        key: "weight_per_sqm",
        value: selectedFabric?.weightPerSqm?.toString() || "",
        type: "number_integer",
      },
      {
        namespace: "shade_sail",
        key: "created_at",
        value: createdAt || new Date().toISOString(),
        type: "date_time",
      },
    ];

    const productMutation = `
            mutation productCreate($input: ProductInput!) {
                productCreate(input: $input) {
                    product {
                        id
                        title
                        handle
                        status
                        metafields(first: 20, namespace: "shade_sail") {
                            edges {
                                node {
                                    id
                                    namespace
                                    key
                                    value
                                }
                            }
                        }
                        variants(first: 1) {
                            edges {
                                node {
                                    id
                                    price
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

    const productInput = {
      title: productTitle,
      descriptionHtml: productDescription,
      productType: "Shade Sail",
      vendor: "Custom Shade Sails",
      status: "ACTIVE",
      tags: "New Custom Shadesail",
      metafields: metafields,
      seo: {
        title: `${productTitle} | Custom Shade Sails`,
        description: `Custom ${selectedFabric.label} shade sail in ${selectedColor.name}. ${selectedFabric.uvProtection} UV protection, ${selectedFabric.warrantyYears} year warranty. Made in ${selectedFabric.madeIn}.`,
      },
    };

    // Execute the product creation mutation
    const productResponse = await admin.graphql(productMutation, {
      variables: { input: productInput },
    });

    const productResult = await productResponse.json();

    if (productResult.data?.productCreate?.userErrors?.length > 0) {
      console.error(
        "Product creation errors:",
        productResult.data.productCreate.userErrors,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Product creation failed",
          details: productResult.data.productCreate.userErrors,
        }),
        { status: 400 },
      );
    }

    const createdProduct = productResult.data?.productCreate?.product;

    if (!createdProduct) {
      throw new Error("Product creation failed - no product returned");
    }

    // Add images to the product
    const imagePromises = [];

    // Add canvas image (technical drawing)
    if (canvasImageUrl) {
      const imageMutation = `
                mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
                    productCreateMedia(media: $media, productId: $productId) {
                        media {
                            id
                            alt
                            mediaContentType
                            status
                        }
                        mediaUserErrors {
                            field
                            message
                        }
                    }
                }
            `;

      const mediaInput = {
        originalSource: canvasImageUrl,
        alt: `${productTitle} - Technical Drawing`,
        mediaContentType: "IMAGE",
      };

      imagePromises.push(
        admin.graphql(imageMutation, {
          variables: {
            media: [mediaInput],
            productId: createdProduct.id,
          },
        }),
      );
    }

    if (selectedColor.imageUrl) {
      const imageMutation = `
                mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
                    productCreateMedia(media: $media, productId: $productId) {
                        media {
                            id
                            alt
                            mediaContentType
                            status
                        }
                        mediaUserErrors {
                            field
                            message
                        }
                    }
                }
            `;

      const mediaInput = {
        originalSource: selectedColor.imageUrl,
        alt: `${selectedFabric.label} - ${selectedColor.name}`,
        mediaContentType: "IMAGE",
      };

      imagePromises.push(
        admin.graphql(imageMutation, {
          variables: {
            media: [mediaInput],
            productId: createdProduct.id,
          },
        }),
      );
    }

    // Wait for all images to be processed
    const imageResults = await Promise.all(imagePromises);
    const processedImages = [];

    for (const imageResponse of imageResults) {
      const imageResult = await imageResponse.json();
      if (imageResult.data?.productCreateMedia?.media) {
        processedImages.push(...imageResult.data.productCreateMedia.media);
      }
    }

    // Fetch the Online Store publication ID
    const publicationsQuery = `
            query {
                publications(first: 10) {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }`;
    const publicationsResponse = await admin.graphql(publicationsQuery);
    const publicationsResult = await publicationsResponse.json();
    const onlineStorePublication =
      publicationsResult.data.publications.edges.find(
        (edge) => edge.node.name === "Online Store",
      );
    if (!onlineStorePublication) {
      throw new Error("Online Store publication not found");
    }
    const onlineStorePublicationId = onlineStorePublication.node.id;

    // Publish the product to the Online Store
    const publishMutation = `
            mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
                publishablePublish(id: $id, input: $input) {
                    publishable {
                        availablePublicationsCount {
                            count
                        }
                        resourcePublicationsCount {
                            count
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`;

    const publishResponse = await admin.graphql(publishMutation, {
      variables: {
        id: createdProduct.id,
        input: [{ publicationId: onlineStorePublicationId }],
      },
    });
    const publishResult = await publishResponse.json();
    if (
      publishResult.data?.publishablePublish?.userErrors &&
      publishResult.data.publishablePublish.userErrors.length > 0
    ) {
      console.error(
        "Publish errors:",
        publishResult.data.publishablePublish.userErrors,
      );
    }

    // Get the complete product with metafields
    const productQuery = `
            query ProductMetafields($ownerId: ID!) {
                product(id: $ownerId) {
                    id
                    title
                    handle
                    status
                    metafields(first: 250, namespace: "shade_sail") {
                        edges {
                            node {
                                namespace
                                key
                                value
                            }
                        }
                    }
                    variants(first: 1) {
                        edges {
                            node {
                                id
                                price
                            }
                        }
                    }
                }
            }`;

    const productResponseFinal = await admin.graphql(productQuery, {
      variables: {
        ownerId: createdProduct.id,
      },
    });

    const productResultFinal = await productResponseFinal.json();
    const product = productResultFinal.data?.product;

    return new Response(
      JSON.stringify({
        success: true,
        product,
        message: "Shade sail product created successfully",
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error creating shade sail product:", error);

    if (error instanceof Error) {
      console.log(`Error creating product: ${error.message}`);
    } else {
      console.log(`An unknown error occurred: ${error}`);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal Server Error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
