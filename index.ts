const UNEXPECTED_RESPONSE = "Unexpected response from Cloudflare Images";

type CloudflareImagesError = { code: number; message: string };

type UploadImageFileResponse = {
  success: boolean;
  errors: CloudflareImagesError[];
  result: UploadImageFileResult | {};
};

type UploadImageFileResult = { id: string; uploaded: Date };

const isUploadImageFileResult = (
  result: UploadImageFileResult | {}
): result is UploadImageFileResult =>
  (result as UploadImageFileResult).id !== undefined &&
  (result as UploadImageFileResult).uploaded !== undefined;

export const uploadImageFile = async (
  uri: string,
  accountId: string,
  apiToken: string
): Promise<UploadImageFileResult> => {
  const filename = uri.split("/").pop();
  const extension = filename?.split(".").pop();
  const type = extension ? `image/${extension}` : "image";

  const formData = new FormData();

  formData.append("file", {
    uri,
    filename,
    type,
  } as unknown as Blob);

  const response = (await (
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: "post",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      }
    )
  ).json()) as UploadImageFileResponse;

  if (!response.success) throw response.errors;

  if (!isUploadImageFileResult(response.result))
    throw new Error(UNEXPECTED_RESPONSE);

  return response.result;
};

export const imageDeliveryURL = (
  imageId: string,
  variantName: string,
  accountHash: string
) => ["https://imagedelivery.net", accountHash, imageId, variantName].join("/");
