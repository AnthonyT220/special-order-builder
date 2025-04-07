import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSpecPdf({ templateName, selections, sku, createdAt, description, imageUrl, logoUrl }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 750;

  if (logoUrl) {
    try {
      const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const scale = 100 / logoImage.width;
      const scaledLogo = logoImage.scale(scale);
      page.drawImage(logoImage, {
        x: 400,
        y: y - scaledLogo.height,
        width: scaledLogo.width,
        height: scaledLogo.height
      });
    } catch (err) {
      console.error('Error embedding logo image:', err);
    }
  }

  page.drawText(`Special Order Spec Sheet`, { x: 50, y, size: 20, font: fontBold });
  y -= 30;
  page.drawText(`Product:`, { x: 50, y, size: 14, font: fontBold });
  page.drawText(templateName, { x: 150, y, size: 14, font });
  y -= 20;
  page.drawText(`SKU:`, { x: 50, y, size: 14, font: fontBold });
  page.drawText(sku, { x: 150, y, size: 14, font });
  y -= 20;

  if (createdAt) {
    page.drawText(`Date:`, { x: 50, y, size: 12, font: fontBold });
    page.drawText(new Date(createdAt).toLocaleDateString(), { x: 150, y, size: 12, font });
    y -= 20;
  }

  if (description) {
    y -= 20;
    page.drawText(`Description:`, { x: 50, y, size: 14, font: fontBold });
    y -= 16;
    const words = description.split(' ');
    let line = '';
    for (const word of words) {
      if (font.widthOfTextAtSize(line + word, 12) > 480) {
        page.drawText(line.trim(), { x: 60, y, size: 12, font });
        y -= 14;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) {
      page.drawText(line.trim(), { x: 60, y, size: 12, font });
      y -= 14;
    }
  }

  if (imageUrl) {
    try {
      const imageBytes = await fetch(imageUrl).then(res => res.arrayBuffer());
      const ext = imageUrl.split('.').pop()?.toLowerCase();

      let embeddedImage;
      if (ext === 'jpg' || ext === 'jpeg') {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else if (ext === 'png') {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      }

      if (embeddedImage) {
        const scaleToFit = (img, maxWidth, maxHeight) => {
          const dims = img.scale(1);
          const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height);
          return img.scale(scale);
        };

        const scaled = scaleToFit(embeddedImage, 200, 200);

        page.drawImage(embeddedImage, {
          x: 50,
          y: y - scaled.height - 10,
          width: scaled.width,
          height: scaled.height
        });
        y -= scaled.height + 20;
      }
    } catch (err) {
      console.error('Error embedding image:', err);
    }
  }

  y -= 20;
  page.drawText(`Selected Options:`, { x: 50, y, size: 14, font: fontBold });
  y -= 20;

  const boldKeys = [
    'Base',
    'Size',
    'Material',
    'Type of Cover',
    'Color',
    'Leg Color',
    'Wood Color'
  ];

  Object.entries(selections).forEach(([key, val]) => {
    const isBold = boldKeys.includes(key);
    page.drawText(`${key}:`, { x: 50, y, size: 12, font: isBold ? fontBold : font });
    page.drawText(`${val}`, { x: 150, y, size: 12, font });
    y -= 16;
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `SpecialOrder_${sku}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
