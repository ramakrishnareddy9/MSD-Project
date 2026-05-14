import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Invoice from '../models/Invoice.model.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads', 'invoices');

// Ensure invoices directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Generate PDF invoice for GST invoice
 * Creates a professional PDF with all invoice details
 */
export const generateInvoicePDF = async (invoiceId) => {
  try {
    // Fetch invoice with all details
    const invoice = await Invoice.findById(invoiceId)
      .populate('sellerId', 'name email phone')
      .populate('buyerId', 'name email phone')
      .populate('orderItems.productId', 'name hsnCode');

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Create PDF document
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4'
    });

    // Set up file path
    const fileName = `${invoice.invoiceNumber.replace(/[/-]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const fileStream = fs.createWriteStream(filePath);

    doc.pipe(fileStream);

    // Render PDF content
    renderInvoiceHeader(doc, invoice);
    doc.moveDown(0.5);
    renderPartyDetails(doc, invoice);
    doc.moveDown(0.5);
    renderInvoiceItems(doc, invoice);
    doc.moveDown(0.5);
    renderTaxSummary(doc, invoice);
    doc.moveDown(0.5);
    renderGSTBreakdown(doc, invoice);
    doc.moveDown(0.5);
    renderTermsAndConditions(doc, invoice);
    renderFooter(doc, invoice);

    // Finalize PDF
    doc.end();

    // Return promise that resolves when PDF is written
    return new Promise((resolve, reject) => {
      fileStream.on('finish', async () => {
        try {
          // Update invoice with PDF path
          invoice.pdfPath = filePath;
          invoice.pdfUrl = `/invoices/${fileName}`;
          invoice.pdfGeneratedAt = new Date();
          await invoice.save();

          resolve({
            pdfPath: filePath,
            pdfUrl: invoice.pdfUrl,
            fileName
          });
        } catch (err) {
          reject(err);
        }
      });

      fileStream.on('error', reject);
      doc.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

/**
 * Render invoice header with company name and invoice number
 */
function renderInvoiceHeader(doc, invoice) {
  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
  doc.moveDown(0.3);

  // Invoice details
  const y = doc.y;
  doc.fontSize(9).font('Helvetica');

  // Left column - Invoice info
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 40, y);
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 40);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 40);
  doc.text(`Order #: ${invoice.orderNumber}`, 40);

  // Right column - Order type and status
  const rightX = 400;
  doc.text(`Order Type: ${invoice.orderType.toUpperCase()}`, rightX, y);
  doc.text(`Status: ${invoice.status}`, rightX);
  doc.text(`GST Invoice: Yes`, rightX);
  doc.text(`Payment Terms: ${invoice.paymentTerms}`, rightX);

  doc.moveDown(0.5);
  drawHorizontalLine(doc, 40, doc.y, 515);
  doc.moveDown(0.5);
}

/**
 * Render seller and buyer party details
 */
function renderPartyDetails(doc, invoice) {
  const y = doc.y;
  const colWidth = 250;

  // Seller (Bill From)
  doc.fontSize(11).font('Helvetica-Bold').text('BILL FROM (Seller):', 40, y);
  doc.fontSize(9).font('Helvetica');
  doc.text(invoice.sellerName || 'N/A', 40, y + 20);
  if (invoice.sellerGSTIN) {
    doc.text(`GSTIN: ${invoice.sellerGSTIN}`, 40);
  }
  if (invoice.sellerAddress) {
    const addr = invoice.sellerAddress;
    const addressStr = `${addr.line1 || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`;
    doc.fontSize(8).text(addressStr, 40);
  }

  // Buyer (Bill To)
  doc.fontSize(11).font('Helvetica-Bold').text('BILL TO (Buyer):', 40 + colWidth, y);
  doc.fontSize(9).font('Helvetica');
  doc.text(invoice.buyerName || 'N/A', 40 + colWidth, y + 20);
  if (invoice.buyerGSTIN) {
    doc.text(`GSTIN: ${invoice.buyerGSTIN}`, 40 + colWidth);
  } else {
    doc.fontSize(8).font('Helvetica-Oblique').text('(Unregistered)', 40 + colWidth);
  }
  if (invoice.deliveryAddress || invoice.buyerAddress) {
    const addr = invoice.deliveryAddress || invoice.buyerAddress;
    const addressStr = `${addr.line1 || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`;
    doc.fontSize(8).font('Helvetica').text(addressStr, 40 + colWidth);
  }

  doc.moveDown(0.3);
}

/**
 * Render line items table
 */
function renderInvoiceItems(doc, invoice) {
  const y = doc.y;
  const tableTop = y + 10;

  // Table headers
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Item', 40, tableTop, { width: 120 });
  doc.text('HSN Code', 165, tableTop, { width: 70 });
  doc.text('Qty', 240, tableTop, { width: 40 });
  doc.text('Unit', 285, tableTop, { width: 40 });
  doc.text('Rate', 330, tableTop, { width: 50 });
  doc.text('Amount', 385, tableTop, { width: 60 });
  doc.text('GST %', 450, tableTop, { width: 35 });
  doc.text('Total', 490, tableTop, { width: 65 });

  drawHorizontalLine(doc, 40, tableTop + 15, 515);
  doc.moveDown(0.8);

  // Table rows
  doc.fontSize(8).font('Helvetica');
  let rowY = doc.y;

  invoice.items.forEach((item, index) => {
    const itemName = item.productName.substring(0, 20);
    const hsnCode = item.hsnCode || 'N/A';

    doc.text(itemName, 40, rowY, { width: 120 });
    doc.text(hsnCode, 165, rowY, { width: 70 });
    doc.text(String(item.quantity), 240, rowY, { width: 40, align: 'right' });
    doc.text(item.unit, 285, rowY, { width: 40 });
    doc.text(formatCurrency(item.unitPrice), 330, rowY, { width: 50, align: 'right' });
    doc.text(formatCurrency(item.itemTotal), 385, rowY, { width: 60, align: 'right' });
    doc.text(`${(item.gstRate * 100).toFixed(0)}%`, 450, rowY, { width: 35, align: 'right' });
    doc.text(formatCurrency(item.totalWithGst), 490, rowY, { width: 65, align: 'right' });

    rowY += 18;
  });

  drawHorizontalLine(doc, 40, doc.y, 515);
  doc.moveDown(0.3);
}

/**
 * Render tax summary
 */
function renderTaxSummary(doc, invoice) {
  const rightX = 400;
  const labelWidth = 100;
  const valueWidth = 115;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica');

  // Subtotal
  doc.text('Subtotal:', rightX, y, { width: labelWidth });
  doc.text(formatCurrency(invoice.subtotal), rightX + labelWidth, y, { width: valueWidth, align: 'right' });
  y += 18;

  // Delivery Fee
  if (invoice.deliveryFee > 0) {
    doc.text('Delivery Fee:', rightX, y, { width: labelWidth });
    doc.text(formatCurrency(invoice.deliveryFee), rightX + labelWidth, y, { width: valueWidth, align: 'right' });
    y += 18;
  }

  // Total GST
  doc.font('Helvetica-Bold');
  doc.text('Total GST:', rightX, y, { width: labelWidth });
  doc.text(formatCurrency(invoice.totalGst), rightX + labelWidth, y, { width: valueWidth, align: 'right' });
  y += 18;

  // Total Amount (highlighted)
  drawHorizontalLine(doc, rightX, y - 2, rightX + labelWidth + valueWidth);
  doc.fontSize(11).text('TOTAL AMOUNT:', rightX, y, { width: labelWidth });
  doc.fontSize(11).text(formatCurrency(invoice.totalAmount), rightX + labelWidth, y, { width: valueWidth, align: 'right' });

  doc.moveDown(1);
}

/**
 * Render GST breakdown by slab
 */
function renderGSTBreakdown(doc, invoice) {
  const y = doc.y;

  doc.fontSize(10).font('Helvetica-Bold').text('GST BREAKDOWN:');
  doc.moveDown(0.2);

  doc.fontSize(8).font('Helvetica-Bold');
  const tableTop = doc.y;
  doc.text('Slab', 40, tableTop, { width: 50 });
  doc.text('Taxable Amount', 95, tableTop, { width: 80 });
  doc.text('SGST', 180, tableTop, { width: 60 });
  doc.text('CGST', 245, tableTop, { width: 60 });
  doc.text('IGST', 310, tableTop, { width: 60 });
  doc.text('Total Tax', 375, tableTop, { width: 80 });

  drawHorizontalLine(doc, 40, tableTop + 15, 515);
  doc.moveDown(0.8);

  doc.fontSize(8).font('Helvetica');
  invoice.gstBreakdown.forEach((breakdown) => {
    const slab = `${(breakdown.slab * 100).toFixed(0)}%`;
    const totalTax = breakdown.sgstAmount + breakdown.cgstAmount + breakdown.igstAmount;

    doc.text(slab, 40, doc.y);
    doc.text(formatCurrency(breakdown.taxableAmount), 95, doc.y, { align: 'right' });
    doc.text(formatCurrency(breakdown.sgstAmount), 180, doc.y, { align: 'right' });
    doc.text(formatCurrency(breakdown.cgstAmount), 245, doc.y, { align: 'right' });
    doc.text(formatCurrency(breakdown.igstAmount), 310, doc.y, { align: 'right' });
    doc.text(formatCurrency(totalTax), 375, doc.y, { align: 'right' });
    doc.moveDown(0.6);
  });

  doc.moveDown(0.3);
}

/**
 * Render terms and conditions
 */
function renderTermsAndConditions(doc, invoice) {
  doc.fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITIONS:');
  doc.moveDown(0.2);

  doc.fontSize(7).font('Helvetica');
  const terms = [
    '1. This is a GST compliant tax invoice as per Indian GST law.',
    `2. Payment Terms: ${invoice.paymentTerms}`,
    `3. Place of Supply: ${invoice.placeOfSupply || 'Not specified'}`,
    invoice.reverseChargeApplicable ? '4. Reverse Charge Applicable: Yes' : '4. Reverse Charge Applicable: No',
    '5. For any discrepancies, please contact the seller within 30 days of invoice date.',
    '6. This invoice is valid for 1 year from the date of issue.'
  ];

  terms.forEach((term) => {
    doc.text(term, 40, doc.y, { width: 515, align: 'left' });
  });

  doc.moveDown(0.3);
}

/**
 * Render footer with invoice generation info
 */
function renderFooter(doc, invoice) {
  const y = doc.y;

  // Draw line at bottom
  drawHorizontalLine(doc, 40, y, 515);
  doc.moveDown(0.3);

  doc.fontSize(7).font('Helvetica-Oblique');
  doc.text(
    `Generated on: ${formatDate(invoice.pdfGeneratedAt || new Date())} | Invoice ID: ${invoice._id} | Status: ${invoice.status}`,
    40,
    doc.y,
    { align: 'center' }
  );
}

/**
 * Utility: Draw horizontal line
 */
function drawHorizontalLine(doc, x1, y, x2) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
}

/**
 * Utility: Format date
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Utility: Format currency in INR
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${Number(amount).toFixed(2)}`;
}

export default {
  generateInvoicePDF
};
