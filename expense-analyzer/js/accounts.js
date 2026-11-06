(function (global) {
  'use strict';

  const app = global.app = global.app || {};

  const SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function rotr(value, shift) {
    return (value >>> shift) | (value << (32 - shift));
  }

  /**
   * Резервная реализация SHA-256 для окружений без crypto.subtle
   * (например, некоторые браузеры при открытии через file://).
   * @param {ArrayBuffer} buffer
   * @returns {string} hex-дайджест
   */
  function sha256Fallback(buffer) {
    const bytes = new Uint8Array(buffer);
    const length = bytes.length;
    const paddedLength = ((length + 9 + 63) >> 6) << 6;
    const data = new Uint8Array(paddedLength);
    data.set(bytes);
    data[length] = 0x80;

    const view = new DataView(data.buffer);
    view.setUint32(paddedLength - 8, Math.floor(length / 0x20000000));
    view.setUint32(paddedLength - 4, (length << 3) >>> 0);

    const hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    for (let offset = 0; offset < paddedLength; offset += 64) {
      const words = new Uint32Array(64);

      for (let i = 0; i < 16; i += 1) {
        words[i] = view.getUint32(offset + i * 4);
      }

      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(words[i - 15], 7) ^ rotr(words[i - 15], 18) ^ (words[i - 15] >>> 3);
        const s1 = rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >>> 10);
        words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = hash;

      for (let i = 0; i < 64; i += 1) {
        const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
        const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (s0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }

    return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
  }

  /**
   * Считает SHA-256 по ArrayBuffer. Основной путь — SubtleCrypto,
   * резервный — чистый JS для file:// и старых браузеров.
   * @param {ArrayBuffer} buffer
   * @returns {Promise<string>}
   */
  async function hashBuffer(buffer) {
    const subtle = global.crypto && global.crypto.subtle;
    if (subtle && typeof subtle.digest === 'function') {
      try {
        const digest = await subtle.digest('SHA-256', buffer);
        return toHex(digest);
      } catch (error) {
        console.warn('crypto.subtle.digest недоступен, используется JS-реализация SHA-256.', error);
      }
    }
    return sha256Fallback(buffer);
  }

  /**
   * @param {File} file
   * @returns {Promise<string>}
   */
  async function hashFile(file) {
    return hashBuffer(await file.arrayBuffer());
  }

  /**
   * UUID v4: crypto.randomUUID() с откатом на getRandomValues / Math.random.
   * @returns {string}
   */
  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      try {
        return global.crypto.randomUUID();
      } catch (error) {
        console.warn('crypto.randomUUID недоступен, используется резервный генератор.', error);
      }
    }

    const bytes = new Uint8Array(16);
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      global.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  /**
   * Подбирает свободный цвет из фиксированной палитры счетов.
   * @param {Array<{color: string}>} accounts
   * @returns {string}
   */
  function pickColor(accounts) {
    const palette = (app.charts && app.charts.ACCOUNT_COLORS) || ['#4f46e5'];
    const used = new Set(accounts.map((account) => String(account.color).toUpperCase()));
    const available = palette.find((color) => !used.has(color.toUpperCase()));
    return available || palette[accounts.length % palette.length];
  }

  /**
   * Создаёт счёт и привязывает к нему транзакции.
   * @param {Object} input
   * @param {string} input.name
   * @param {string} input.sourceFile
   * @param {string} input.fileHash
   * @param {Array<Object>} input.transactions
   * @param {string} [input.accountNumber]
   * @param {string} [input.bankName]
   * @param {Array<Object>} accounts существующие счета (для уникального цвета)
   * @returns {Object}
   */
  function createAccount(input, accounts) {
    const id = createId();
    const name = String(input.name || '').trim() || 'Новый счёт';

    const transactions = (input.transactions || []).map((transaction, index) => ({
      ...transaction,
      id: `${id}-${index}`,
      accountId: id,
      ignored: Boolean(transaction.ignored),
      includedManually: Boolean(transaction.includedManually)
    }));

    return {
      id,
      name,
      sourceFile: input.sourceFile || 'Выписка.xlsx',
      fileHash: input.fileHash || '',
      color: pickColor(accounts || []),
      accountNumber: input.accountNumber || '',
      bankName: input.bankName || '',
      transactions,
      createdAt: Date.now()
    };
  }

  /**
   * @param {Object} account
   * @param {string} name
   * @returns {string}
   */
  function renameAccount(account, name) {
    const next = String(name || '').trim();
    if (account && next) account.name = next;
    return account ? account.name : '';
  }

  /**
   * @param {Array<Object>} accounts
   * @param {string} accountId
   * @returns {Array<Object>}
   */
  function removeAccount(accounts, accountId) {
    return accounts.filter((account) => account.id !== accountId);
  }

  app.accounts = {
    hashBuffer,
    hashFile,
    createId,
    createAccount,
    renameAccount,
    removeAccount,
    pickColor,
    sha256Fallback
  };
})(window);
