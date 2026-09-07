const databaseName = 'kross-media-v1';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(databaseName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('clips');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function storeClip(
  id: string,
  blob: Blob,
  seconds = 0,
): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite');
    tx.objectStore('clips').put({ blob, seconds }, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function readClip(
  id: string,
): Promise<{ blob: Blob; seconds: number } | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction('clips').objectStore('clips').get(id);
    req.onsuccess = () => {
      db.close();
      resolve(
        req.result instanceof Blob
          ? { blob: req.result, seconds: 0 }
          : req.result,
      );
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
