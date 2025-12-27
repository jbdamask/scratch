/**
 * ShareIt React Button Component
 *
 * Usage:
 * 1. Add to public/index.html:
 *    <script src="https://<YOUR-BUCKET>.s3.amazonaws.com/share.js"></script>
 *
 * 2. Import and use:
 *    import ShareButton from './ShareButton';
 *    <ShareButton />
 */

declare global {
  interface Window {
    ShareIt: {
      share: () => Promise<string | null>;
    };
  }
}

function ShareButton() {
  const handleShare = () => {
    if (!window.ShareIt) {
      alert('ShareIt not loaded. Add share.js to your index.html:\n<script src="https://<YOUR-BUCKET>.s3.amazonaws.com/share.js"></script>');
      return;
    }
    window.ShareIt.share();
  };

  return (
    <button onClick={handleShare}>
      Share
    </button>
  );
}

export default ShareButton;
