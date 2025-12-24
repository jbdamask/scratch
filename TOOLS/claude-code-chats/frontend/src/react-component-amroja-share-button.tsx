/**
 * ShareIt React Button Component
 *
 * Usage:
 * 1. Add to public/index.html:
 *    <script src="https://amroja-shared-web-pages.s3.amazonaws.com/share.js"></script>
 *
 * 2. Import and use:
 *    import ShareButton from './react-component-amroja-share-button';
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
    window.ShareIt.share();
  };

  return (
    <button onClick={handleShare}>
      Share
    </button>
  );
}

export default ShareButton;
