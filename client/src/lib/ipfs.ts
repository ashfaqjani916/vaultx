const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";
const IPFS_GATEWAY =
  import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export function getIPFSUrl(cid: string): string {
  if (!cid) return "";
  return `${IPFS_GATEWAY}/${cid}`;
}

export async function uploadToIPFS(
  file: File,
  metadata: Record<string, string>
): Promise<{ metadataCid: string; fileCid: string }> {
  if (!PINATA_JWT) {
    throw new Error(
      "VITE_PINATA_JWT is not set. Configure it in client/.env to enable IPFS uploads."
    );
  }

  // 1. Upload the document file
  const fileForm = new FormData();
  fileForm.append("file", file);
  fileForm.append("pinataMetadata", JSON.stringify({ name: file.name }));
  fileForm.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const fileRes = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: fileForm,
    }
  );

  if (!fileRes.ok) {
    const err = await fileRes.text();
    throw new Error(`IPFS file upload failed: ${err}`);
  }

  const fileData = await fileRes.json();
  const fileCid = fileData.IpfsHash as string;

  // 2. Upload metadata JSON referencing the file
  const metaPayload = {
    documentFields: metadata,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileCid,
    uploadedAt: new Date().toISOString(),
  };

  const metaBlob = new Blob([JSON.stringify(metaPayload, null, 2)], {
    type: "application/json",
  });
  const metaForm = new FormData();
  metaForm.append("file", metaBlob, "metadata.json");
  metaForm.append(
    "pinataMetadata",
    JSON.stringify({ name: `meta_${file.name}` })
  );
  metaForm.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const metaRes = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: metaForm,
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`IPFS metadata upload failed: ${err}`);
  }

  const metaData = await metaRes.json();
  return { metadataCid: metaData.IpfsHash as string, fileCid };
}

export async function uploadJsonToIPFS(
  payload: unknown,
  fileName = "metadata.json"
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error(
      "VITE_PINATA_JWT is not set. Configure it in client/.env to enable IPFS uploads."
    );
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append("file", blob, fileName);
  form.append("pinataMetadata", JSON.stringify({ name: fileName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`IPFS JSON upload failed: ${err}`);
  }

  const data = await res.json();
  return data.IpfsHash as string;
}

export async function unpinFromIPFS(cid: string): Promise<void> {
  if (!PINATA_JWT || !cid) return;

  const res = await fetch(
    `https://api.pinata.cloud/pinning/unpin/${cid}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`IPFS unpin failed: ${err}`);
  }
}

export async function fetchFromIPFS<T = unknown>(cid: string): Promise<T> {
  const url = getIPFSUrl(cid);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch from IPFS: ${res.statusText}`);
  return res.json() as Promise<T>;
}
