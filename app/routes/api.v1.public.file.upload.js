import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.public.appProxy(request);

    const formData = await request.formData();
    const file = formData.get("file");

    const response = await admin.graphql(
      `#graphql
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
          }
        }`,
      {
        variables: {
          input: [
            {
              filename: file.name,
              mimeType: file.type,
              httpMethod: "POST",
              resource: "IMAGE",
            },
          ],
        },
      }
    );

    const data = await response.json();
    const uploadTarget = data?.data.stagedUploadsCreate.stagedTargets[0];
    const stageurl = uploadTarget.url;

    const uploadData = new FormData();
    uploadTarget.parameters.forEach((params) =>
      uploadData.append(params.name, params.value)
    );
    uploadData.append("file", file);

    const sendfileres = await fetch(stageurl, {
      method: "POST",
      body: uploadData,
    });

    if (!sendfileres.ok) {
      throw new Error("Failed to upload file to staged URL.");
    }

    const resourceUrl = uploadTarget.resourceUrl;

    const rawResult = await admin.graphql(
      `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              alt
              createdAt
              fileStatus
              preview {
                image {
                  url
                  
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          files: [
            {
              alt: "Page Builder: Theme Library",
              contentType: "IMAGE",
              originalSource: resourceUrl,
            },
          ],
        },
      }
    );

    const result = await rawResult.json();

    if (result.data?.fileCreate?.userErrors?.length) {
      console.error("GraphQL errors:", result.data.fileCreate.userErrors);
      return { success: false, error: "GraphQL mutation failed." };
    }

    const uploadedFile = result.data.fileCreate.files[0];
    const fileId = uploadedFile.id;

    console.log(`file uploaded`)

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let fileStatus = uploadedFile?.fileStatus;
    let finalFileData = null;
    const maxAttempts = 10;
    let attempts = 0;

    while (fileStatus !== "READY" && attempts < maxAttempts) {
      await wait(1000); 
      attempts++;

      const getFileResponse = await admin.graphql(
        `query getFile($id: ID!) {
          node(id: $id) {
            ... on MediaImage {
              id
              alt
              image {
                url
              }
              fileStatus
            }
          }
        }`,
        {
          variables: {
            id: fileId,
          },
        }
      );

      const fileData = await getFileResponse.json();
      fileStatus = fileData?.data?.node?.fileStatus;
      finalFileData = fileData?.data?.node;
    }

    if (fileStatus === "READY") {
      console.log("File is ready:");
      return { url: finalFileData?.image?.url, success: true };
    } else {
      console.error("File not ready after polling.");
      return { success: false, error: "File not ready." };
    }
  } catch (error) {
    console.log("error: ", error);
    if (error instanceof Error) {
      console.log(`Error occurred while uploading file: ${error.message}`);
    } else {
      console.log("An unknown error occurred.");
    }
    return { error: "Internal server error.", success: false };
  }
};
