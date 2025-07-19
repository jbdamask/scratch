# Social Media Image Cropper

A recreation of [Simon Willison's social-media-cropper.html tool](https://github.com/simonw/tools/tree/main), built as a single HTML file with enhanced features and platform-specific optimizations.

## Features

### Image Input
- **Drag & Drop**: Drop images directly onto the page
- **File Picker**: Click to select images from your device
- **Paste Support**: Paste images directly from clipboard (Ctrl+V/Cmd+V)

### Interactive Cropping
- **Movable Viewport**: Blue rectangle overlay that you can drag to select crop area
- **Platform-Specific Aspect Ratios**:
  - 2:1 (Twitter/LinkedIn) → 1200×600px output
  - 1.91:1 (Facebook) → 1200×628px output  
  - 1.4:1 (Substack) → 1400×1000px output
  - 1:1 (Instagram) → 1080×1080px output

### Zoom Controls
- **+ / - Buttons**: Step zoom in/out
- **Mouse Wheel**: Smooth zoom control
- **100% Reset Button**: Return to original size instantly
- **Zoom Range**: 0.3x to 5x for precise framing

### Customization
- **Background Color Picker**: Choose fill color for areas outside the image
- **Real-time Preview**: See exactly what your cropped image will look like
- **Dimensions Display**: Shows output pixel dimensions for each platform

### Export
- **High-Quality JPEG**: 0.7 compression quality for optimal file size/quality balance
- **Platform-Optimized Sizes**: Outputs exact pixel dimensions required by each social media platform
- **Smart Filenames**: Downloads named by platform (e.g., "twitter-linkedin-card.jpg")

## Technical Implementation

- **No Dependencies**: Single HTML file with embedded CSS and JavaScript
- **Modern Browser APIs**: Uses FileReader, Canvas, and Blob APIs
- **Responsive Design**: Works on desktop and mobile devices
- **Object-fit Handling**: Properly accounts for how images are displayed within containers
- **Precise Coordinate Mapping**: Viewport position accurately maps to final crop area

## Usage

1. Open `image-cropper.html` in any modern web browser
2. Upload an image via drag & drop, file picker, or paste
3. Select your target platform from the aspect ratio dropdown
4. Drag the blue viewport rectangle to frame your desired crop area
5. Use zoom controls to fine-tune the framing
6. Adjust background color if needed
7. Click "Download JPEG" to save your optimized social media image

## Inspiration

This tool was inspired by and recreates the functionality of Simon Willison's original [social-media-cropper.html](https://github.com/simonw/tools/tree/main) with additional enhancements for modern social media platform requirements.