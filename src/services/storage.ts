import { storage } from "../firebase";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  ref,
} from "firebase/storage";

export type UploadedPhoto = {
  name: string;
  url: string;
  contentType?: string | null;
};

export async function uploadTaskPhoto(
  hid: string,
  taskId: string,
  uri: string,
  opts?: { contentType?: string; fileName?: string },
): Promise<UploadedPhoto> {
  const fileName =
    opts?.fileName || `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const path = `households/${hid}/tasks/${taskId}/${fileName}`;
  const r = storageRef(storage, path);

  // fetch the file and convert to blob (works in Expo)
  const res = await fetch(uri);
  const blob = await res.blob();
  const contentType = opts?.contentType || blob.type || "image/jpeg";
  await uploadBytes(r, blob, { contentType });
  const url = await getDownloadURL(r);
  return { name: fileName, url, contentType };
}

export async function listTaskPhotos(
  hid: string,
  taskId: string,
): Promise<UploadedPhoto[]> {
  const dir = ref(storage, `households/${hid}/tasks/${taskId}`);
  try {
    const res = await listAll(dir);
    const items = await Promise.all(
      res.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return { name: item.name, url } as UploadedPhoto;
      }),
    );
    return items;
  } catch {
    // If directory doesn't exist yet
    return [];
  }
}
