const UNEXPECTED_RESPONSE = "Unexpected response from Cloudflare Images";

export type CloudflareImage = { id: string; uploaded: string };

type CloudflareImagesError = { code: number; message: string };

/* Image Delivery URL */

export const imageDeliveryURL = (
  imageId: string,
  variantName: string,
  accountHash: string
) => ["https://imagedelivery.net", accountHash, imageId, variantName].join("/");

/* Upload Image */

type UploadImageFileResponse = {
  success: boolean;
  errors: CloudflareImagesError[];
  result: UploadImageFileResult | Record<string, never>;
};

type UploadImageFileResult = CloudflareImage;

const isUploadImageFileResult = (
  result: UploadImageFileResult | Record<string, never>
): result is UploadImageFileResult =>
  (result as UploadImageFileResult).id !== undefined &&
  (result as UploadImageFileResult).uploaded !== undefined;

export const uploadImageFile = async (
  uri: string,
  accountId: string,
  apiToken: string
): Promise<CloudflareImage> => {
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

/* List Images */

type ListImagesResponse = {
  success: boolean;
  errors: CloudflareImagesError[];
  result: ListImagesResult | Record<string, never>;
};

type ListImagesResult = {
  continuation_token: string | null;
  images: CloudflareImage[];
};

const isListImagesResult = (
  result: ListImagesResult | Record<string, never>
): result is ListImagesResult =>
  (result as ListImagesResult).continuation_token !== undefined &&
  (result as ListImagesResult).images !== undefined;

export const listImages = async (
  perPage: number,
  sortOrder: "asc" | "desc",
  continuationToken: string | null,
  accountId: string,
  apiToken: string
): Promise<CloudflareImage[]> => {
  const queryParams: string[] = [];

  queryParams.push(["per_page", perPage].join("="));
  queryParams.push(["sort_order", sortOrder].join("="));

  if (continuationToken)
    queryParams.push(["continuation_token", continuationToken].join("="));

  const response = (await (
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2?${queryParams.join(
        "&"
      )}`,
      {
        method: "get",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
        },
      }
    )
  ).json()) as ListImagesResponse;

  if (!response.success) throw response.errors;

  if (!isListImagesResult(response.result))
    throw new Error(UNEXPECTED_RESPONSE);

  return response.result.images;
};
