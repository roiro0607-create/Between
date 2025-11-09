// 画像をリサイズしてBase64に変換
export const resizeAndConvertToBase64 = (file, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('ファイルが選択されていません'));
      return;
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('画像サイズは5MB以下にしてください'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // アスペクト比を保ちながらリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Base64に変換（品質を調整）
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('画像の読み込みに失敗しました'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsDataURL(file);
  });
};
