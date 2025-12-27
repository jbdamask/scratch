/**
 * ShareIt - Static HTML Sharing Library
 *
 * Captures page content, uploads to S3 via presigned URL, returns public URL.
 *
 * Usage (after deployment):
 *   <script src="https://<YOUR-BUCKET>.s3.amazonaws.com/share.js"></script>
 *   <button onclick="ShareIt.share()">Share</button>
 */

const ShareIt = {
  // Lambda Function URL - injected at deployment time by deploy-sharejs.sh
  LAMBDA_ENDPOINT: "%%LAMBDA_ENDPOINT%%",

  // Maximum file size (50MB)
  MAX_SIZE: 50 * 1024 * 1024,

  // Filename validation regex
  FILENAME_REGEX: /^[a-zA-Z0-9_-]{1,100}$/,

  /**
   * Main entry point. Prompts for filename, captures page, uploads, displays result.
   * @returns {Promise<string>} Public URL of the shared page
   */
  async share() {
    try {
      const filename = await this.promptFilename();
      if (!filename) return null;

      this.showLoading();
      const html = this.captureDOM();

      if (html.length > this.MAX_SIZE) {
        throw new Error("Content too large (max 50MB)");
      }

      const { presignedUrl, publicUrl } = await this.getUploadUrl(filename);
      await this.uploadToS3(presignedUrl, html);

      const copied = await this.copyToClipboard(publicUrl);
      this.showResult(publicUrl, copied);
      return publicUrl;
    } catch (error) {
      this.showError(error.message);
      throw error;
    }
  },

  /**
   * Captures the current DOM state with inlined CSS.
   * @returns {string} Complete HTML document as string
   */
  captureDOM() {
    const clone = document.body.cloneNode(true);

    // Inline styles BEFORE removing elements (to maintain index alignment)
    this.inlineStyles(document.body, clone);

    // Now remove scripts and form elements
    clone.querySelectorAll("script, input, textarea, select, button[type='submit']")
      .forEach(el => el.remove());

    // Remove ShareIt modal overlays if present
    clone.querySelectorAll(".shareit-overlay")
      .forEach(el => el.remove());

    // Remove ShareIt buttons (any element with onclick containing "ShareIt")
    clone.querySelectorAll("[onclick*='ShareIt']")
      .forEach(el => el.remove());

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shared Content</title>
  <style>
    /* Responsive defaults for shared content */
    body { max-width: 100%; margin: 0 auto; }
    img, video, iframe { max-width: 100%; height: auto; }
    pre, code { overflow-x: auto; }
  </style>
</head>
${clone.outerHTML}
</html>`;
  },

  /**
   * Copies computed styles from original elements to cloned elements.
   * Skips width/height properties to allow responsive scaling.
   * @param {Element} original - Original DOM element
   * @param {Element} clone - Cloned DOM element
   */
  inlineStyles(original, clone) {
    // Properties to skip for responsive output
    // Includes both traditional and logical (inline/block) sizing properties
    const skipProps = new Set([
      'width', 'min-width', 'max-width',
      'height', 'min-height', 'max-height',
      'inline-size', 'min-inline-size', 'max-inline-size',
      'block-size', 'min-block-size', 'max-block-size',
      'left', 'right', 'top', 'bottom',
      'inset-inline', 'inset-block', 'inset-inline-start', 'inset-inline-end',
      'inset-block-start', 'inset-block-end'
    ]);

    // Helper to extract computed styles, skipping width/height
    const getStyleString = (el) => {
      const computed = window.getComputedStyle(el);
      let styles = '';
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        if (skipProps.has(prop)) continue;
        const value = computed.getPropertyValue(prop);
        if (value) {
          styles += `${prop}: ${value}; `;
        }
      }
      return styles;
    };

    // Apply styles to body itself
    clone.style.cssText = getStyleString(original);

    // Get all elements from both trees
    const originalElements = Array.from(original.querySelectorAll("*"));
    const cloneElements = Array.from(clone.querySelectorAll("*"));

    // Apply styles to all child elements
    originalElements.forEach((el, i) => {
      if (cloneElements[i]) {
        try {
          cloneElements[i].style.cssText = getStyleString(el);
        } catch (e) {
          // Skip elements that can't have styles computed
        }
      }
    });
  },

  /**
   * Validates filename format.
   * @param {string} filename - Filename to validate
   * @returns {boolean} True if valid
   */
  validateFilename(filename) {
    return this.FILENAME_REGEX.test(filename);
  },

  /**
   * Fetches a presigned upload URL from the Lambda.
   * @param {string} filename - Desired filename (without extension)
   * @returns {Promise<{presignedUrl: string, publicUrl: string, finalFilename: string}>}
   */
  async getUploadUrl(filename) {
    const response = await fetch(this.LAMBDA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to get upload URL");
    }
    return data;
  },

  /**
   * Uploads HTML content to S3 using a presigned URL.
   * @param {string} presignedUrl - Presigned S3 PUT URL
   * @param {string} html - HTML content to upload
   */
  async uploadToS3(presignedUrl, html) {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/html" },
      body: html
    });

    if (!response.ok) {
      throw new Error("Failed to upload to S3");
    }
  },

  /**
   * Copies text to clipboard.
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} True if successful
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // Modal UI Methods
  // ─────────────────────────────────────────────────────────────────

  /**
   * Shows filename prompt modal.
   * @returns {Promise<string|null>} Validated filename or null if cancelled
   */
  promptFilename() {
    return new Promise((resolve) => {
      const overlay = this.createOverlay();
      const modal = document.createElement("div");
      modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      modal.innerHTML = `
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #333;">Share this page</h2>
        <p style="margin: 0 0 12px; font-size: 14px; color: #666;">
          Enter a filename for your shared page:
        </p>
        <input type="text" id="shareit-filename" placeholder="my-page" style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          margin-bottom: 8px;
        ">
        <p id="shareit-error" style="
          margin: 0 0 12px;
          font-size: 12px;
          color: #e53935;
          display: none;
        "></p>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="shareit-cancel" style="
            padding: 10px 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
          <button id="shareit-submit" style="
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            background: #1976d2;
            color: white;
            cursor: pointer;
            font-size: 14px;
          ">Share</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const input = modal.querySelector("#shareit-filename");
      const error = modal.querySelector("#shareit-error");
      const cancelBtn = modal.querySelector("#shareit-cancel");
      const submitBtn = modal.querySelector("#shareit-submit");

      input.focus();

      const cleanup = () => {
        overlay.remove();
      };

      const submit = () => {
        const filename = input.value.trim();
        if (!filename) {
          error.textContent = "Please enter a filename";
          error.style.display = "block";
          return;
        }
        if (!this.validateFilename(filename)) {
          error.textContent = "Use only letters, numbers, hyphens, underscores (max 100 chars)";
          error.style.display = "block";
          return;
        }
        cleanup();
        resolve(filename);
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };

      submitBtn.onclick = submit;

      input.onkeydown = (e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          cleanup();
          resolve(null);
        }
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      };
    });
  },

  /**
   * Shows loading modal with spinner.
   */
  showLoading() {
    this.removeExistingModals();
    const overlay = this.createOverlay();
    overlay.id = "shareit-loading";

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-top-color: #1976d2;
        border-radius: 50%;
        margin: 0 auto 16px;
        animation: shareit-spin 1s linear infinite;
      "></div>
      <p style="margin: 0; color: #666; font-size: 14px;">Uploading...</p>
      <style>
        @keyframes shareit-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  },

  /**
   * Shows result modal with public URL.
   * @param {string} url - Public URL of shared page
   * @param {boolean} copied - Whether URL was copied to clipboard
   */
  showResult(url, copied) {
    this.removeExistingModals();
    const overlay = this.createOverlay();

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        width: 48px;
        height: 48px;
        background: #e8f5e9;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      ">
        <svg width="24" height="24" fill="none" stroke="#43a047" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #333; text-align: center;">
        Page shared successfully!
      </h2>
      <p style="margin: 0 0 16px; font-size: 14px; color: #666; text-align: center;">
        ${copied ? "URL copied to clipboard" : "Copy the URL below"}
      </p>
      <div style="
        background: #f5f5f5;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 16px;
        word-break: break-all;
      ">
        <a href="${url}" target="_blank" style="
          color: #1976d2;
          text-decoration: none;
          font-size: 14px;
        ">${url}</a>
      </div>
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button id="shareit-copy" style="
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        ">Copy URL</button>
        <button id="shareit-close" style="
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          background: #1976d2;
          color: white;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const copyBtn = modal.querySelector("#shareit-copy");
    const closeBtn = modal.querySelector("#shareit-close");

    copyBtn.onclick = async () => {
      const success = await this.copyToClipboard(url);
      copyBtn.textContent = success ? "Copied!" : "Failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy URL";
      }, 2000);
    };

    closeBtn.onclick = () => overlay.remove();

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  },

  /**
   * Shows error modal.
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.removeExistingModals();
    const overlay = this.createOverlay();

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        width: 48px;
        height: 48px;
        background: #ffebee;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      ">
        <svg width="24" height="24" fill="none" stroke="#e53935" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #333; text-align: center;">
        Share failed
      </h2>
      <p id="shareit-error-message" style="margin: 0 0 16px; font-size: 14px; color: #666; text-align: center;"></p>
      <div style="display: flex; justify-content: center;">
        <button id="shareit-close" style="
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          background: #1976d2;
          color: white;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    // Set message via textContent to prevent XSS
    modal.querySelector("#shareit-error-message").textContent = message;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeBtn = modal.querySelector("#shareit-close");
    closeBtn.onclick = () => overlay.remove();

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  },

  /**
   * Creates a modal overlay element.
   * @returns {HTMLElement} Overlay element
   */
  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "shareit-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    `;
    return overlay;
  },

  /**
   * Removes any existing ShareIt modals.
   */
  removeExistingModals() {
    document.querySelectorAll(".shareit-overlay, #shareit-loading").forEach(el => el.remove());
  }
};

// Attach to window for browser usage
window.ShareIt = ShareIt;

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = ShareIt;
}
