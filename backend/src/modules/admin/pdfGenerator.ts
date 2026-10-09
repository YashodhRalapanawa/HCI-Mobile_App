import type { AdminReportData } from './reports.service.js';

interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Robust pure-TypeScript PDF document builder conforming to the PDF 1.4 specification.
 * Supports multi-page pagination, vector drawing, alternating table row styling,
 * table header repetition across page breaks, text wrapping, and "Page X of Y" footers.
 */
class ReportPdfBuilder {
  private pages: string[] = [];
  private currentPage = '';
  private readonly pageWidth = 595.28;
  private readonly pageHeight = 841.89;
  private readonly leftMargin = 40;
  private readonly rightMargin = 555.28;
  private readonly contentWidth = 515.28;
  private readonly topMargin = 790;
  private readonly bottomMargin = 55;

  private currentY: number;

  constructor() {
    this.currentY = this.topMargin;
    this.newPage();
  }

  public newPage(): void {
    if (this.currentPage) {
      this.pages.push(this.currentPage);
    }
    this.currentPage = '';
    this.currentY = this.topMargin;
  }

  public ensureSpace(neededHeight: number): void {
    if (this.currentY - neededHeight < this.bottomMargin) {
      this.newPage();
    }
  }

  public getCurrentY(): number {
    return this.currentY;
  }

  public advanceY(amount: number): void {
    this.currentY -= amount;
  }

  private raw(str: string): void {
    this.currentPage += str + '\n';
  }

  public rect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: [number, number, number],
    stroke?: [number, number, number],
    lineWidth = 1,
  ): void {
    let op = 'q\n';
    if (fill) {
      op += `${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg\n`;
    }
    if (stroke) {
      op += `${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG\n${lineWidth} w\n`;
    }
    op += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re\n`;
    if (fill && stroke) {
      op += 'B\n';
    } else if (fill) {
      op += 'f\n';
    } else if (stroke) {
      op += 'S\n';
    }
    op += 'Q\n';
    this.raw(op);
  }

  public line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number] = [0.85, 0.85, 0.85],
    width = 1,
  ): void {
    this.raw(
      `q\n${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} RG\n${width} w\n${x1.toFixed(
        2,
      )} ${y1.toFixed(2)} m\n${x2.toFixed(2)} ${y2.toFixed(2)} l\nS\nQ\n`,
    );
  }

  public text(
    str: string,
    x: number,
    y: number,
    size = 10,
    font: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' = 'Helvetica',
    color: [number, number, number] = [0.1, 0.1, 0.1],
  ): void {
    const fontName = font === 'Helvetica-Bold' ? '/F2' : font === 'Helvetica-Oblique' ? '/F3' : '/F1';
    const sanitized = str
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u2022\u2219\u00B7]/g, '|')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
    const escaped = sanitized.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.raw(
      `BT\n${fontName} ${size} Tf\n${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(
        3,
      )} rg\n${x.toFixed(2)} ${y.toFixed(2)} Td\n(${escaped}) Tj\nET\n`,
    );
  }

  public wrapText(text: string, maxWidth: number, fontSize = 9): string[] {
    const avgCharWidth = fontSize * 0.52;
    const maxChars = Math.max(10, Math.floor(maxWidth / avgCharWidth));
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : ['-'];
  }

  public drawTable(
    columns: TableColumn[],
    rows: string[][],
    sectionTitle?: string,
    footnote?: string,
  ): void {
    const headerHeight = 22;
    const minRowHeight = 18;

    // Optional section title
    if (sectionTitle) {
      this.ensureSpace(45);
      this.text(sectionTitle, this.leftMargin, this.currentY - 14, 12, 'Helvetica-Bold', [0.12, 0.16, 0.22]);
      this.line(this.leftMargin, this.currentY - 18, this.rightMargin, this.currentY - 18, [0.85, 0.88, 0.92], 1);
      this.advanceY(26);
    }

    const drawHeader = () => {
      this.rect(this.leftMargin, this.currentY - headerHeight, this.contentWidth, headerHeight, [0.93, 0.94, 0.96], [0.8, 0.83, 0.88], 0.75);
      let curX = this.leftMargin;
      for (const col of columns) {
        let textX = curX + 6;
        if (col.align === 'right') {
          const charLen = col.header.length * 5.2;
          textX = curX + col.width - charLen - 6;
        } else if (col.align === 'center') {
          const charLen = col.header.length * 5.2;
          textX = curX + (col.width - charLen) / 2;
        }
        this.text(col.header, Math.max(curX + 4, textX), this.currentY - 15, 8.5, 'Helvetica-Bold', [0.2, 0.24, 0.3]);
        curX += col.width;
      }
      this.advanceY(headerHeight);
    };

    // Draw initial header
    this.ensureSpace(headerHeight + minRowHeight * 2);
    drawHeader();

    if (rows.length === 0) {
      this.rect(this.leftMargin, this.currentY - minRowHeight, this.contentWidth, minRowHeight, [0.98, 0.98, 0.99], [0.88, 0.9, 0.92], 0.5);
      this.text('No records found for this period.', this.leftMargin + 12, this.currentY - 13, 8.5, 'Helvetica-Oblique', [0.45, 0.5, 0.55]);
      this.advanceY(minRowHeight);
    } else {
      let rowIndex = 0;
      for (const row of rows) {
        // Calculate max lines in any cell in this row
        let maxLines = 1;
        const cellLinesArray: string[][] = [];
        for (let c = 0; c < columns.length; c++) {
          const col = columns[c];
          if (!col) continue;
          const rawCell = row[c] || '';
          const lines = this.wrapText(rawCell, col.width - 12, 8.5);
          cellLinesArray.push(lines);
          if (lines.length > maxLines) {
            maxLines = lines.length;
          }
        }

        const rowHeight = Math.max(minRowHeight, maxLines * 12 + 6);

        // Check if page break is needed. If so, start new page and REPEAT table header!
        if (this.currentY - rowHeight < this.bottomMargin) {
          this.newPage();
          drawHeader();
        }

        const isEven = rowIndex % 2 === 0;
        const bgFill: [number, number, number] = isEven ? [1, 1, 1] : [0.97, 0.98, 0.99];

        this.rect(this.leftMargin, this.currentY - rowHeight, this.contentWidth, rowHeight, bgFill, [0.88, 0.9, 0.93], 0.5);

        let cellX = this.leftMargin;
        for (let c = 0; c < columns.length; c++) {
          const col = columns[c];
          if (!col) continue;
          const lines = cellLinesArray[c] || [];
          let startY = this.currentY - 11;

          for (const lineText of lines) {
            let lineX = cellX + 6;
            if (col.align === 'right') {
              const textWidth = lineText.length * 4.8;
              lineX = cellX + col.width - textWidth - 6;
            } else if (col.align === 'center') {
              const textWidth = lineText.length * 4.8;
              lineX = cellX + (col.width - textWidth) / 2;
            }
            this.text(lineText, Math.max(cellX + 2, lineX), startY, 8.5, 'Helvetica', [0.18, 0.22, 0.28]);
            startY -= 11;
          }

          cellX += col.width;
        }

        this.advanceY(rowHeight);
        rowIndex++;
      }
    }

    if (footnote) {
      const footLines = this.wrapText(footnote, this.contentWidth - 10, 7.5);
      const footHeight = footLines.length * 10 + 6;
      this.ensureSpace(footHeight);
      let curFootY = this.currentY - 9;
      for (const line of footLines) {
        this.text(line, this.leftMargin + 4, curFootY, 7.5, 'Helvetica-Oblique', [0.45, 0.49, 0.55]);
        curFootY -= 10;
      }
      this.advanceY(footHeight);
    } else {
      this.advanceY(10);
    }
  }

  public drawKpiGrid(cards: Array<{ title: string; main: string; sub?: string }>): void {
    const cardWidth = (this.contentWidth - 16) / 3;
    const cardHeight = 52;

    this.ensureSpace(cardHeight * 2 + 16);

    for (let i = 0; i < cards.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);

      const x = this.leftMargin + col * (cardWidth + 8);
      const y = this.currentY - (row + 1) * cardHeight - row * 8;

      this.rect(x, y, cardWidth, cardHeight, [0.98, 0.985, 0.995], [0.85, 0.88, 0.92], 0.75);
      // Small top accent bar
      this.rect(x, y + cardHeight - 3, cardWidth, 3, [0.75, 0.15, 0.15]);

      const card = cards[i];
      if (!card) continue;
      this.text(card.title, x + 8, y + cardHeight - 14, 7.5, 'Helvetica-Bold', [0.4, 0.45, 0.52]);
      this.text(card.main, x + 8, y + cardHeight - 32, 14, 'Helvetica-Bold', [0.1, 0.14, 0.2]);
      if (card.sub) {
        this.text(card.sub, x + 8, y + cardHeight - 44, 7, 'Helvetica', [0.45, 0.5, 0.56]);
      }
    }

    const numRows = Math.ceil(cards.length / 3);
    this.advanceY(numRows * (cardHeight + 8) + 8);
  }

  public drawNotesBox(title: string, notes: string[]): void {
    let totalHeight = 24;
    const processedNotes: string[][] = [];
    for (const note of notes) {
      const lines = this.wrapText(note, this.contentWidth - 28, 8);
      processedNotes.push(lines);
      totalHeight += lines.length * 11 + 6;
    }

    this.ensureSpace(totalHeight);

    this.rect(this.leftMargin, this.currentY - totalHeight, this.contentWidth, totalHeight, [0.97, 0.98, 0.99], [0.82, 0.85, 0.9], 0.75);
    // Accent left stripe
    this.rect(this.leftMargin, this.currentY - totalHeight, 4, totalHeight, [0.75, 0.15, 0.15]);

    this.text(title, this.leftMargin + 14, this.currentY - 16, 9.5, 'Helvetica-Bold', [0.15, 0.2, 0.28]);

    let curY = this.currentY - 30;
    for (const lines of processedNotes) {
      for (let l = 0; l < lines.length; l++) {
        const prefix = l === 0 ? '•  ' : '    ';
        this.text(prefix + lines[l], this.leftMargin + 14, curY, 8, 'Helvetica', [0.28, 0.32, 0.38]);
        curY -= 11;
      }
      curY -= 5;
    }

    this.advanceY(totalHeight + 12);
  }

  public build(reportData: AdminReportData): Buffer {
    if (this.currentPage) {
      this.pages.push(this.currentPage);
      this.currentPage = '';
    }
    const totalPages = this.pages.length;

    // Second pass: apply running header (pages 2+) and footer (all pages) with exact totalPages
    for (let i = 0; i < totalPages; i++) {
      let overlay = '';
      const pageNum = i + 1;

      // Running header on page 2 and later
      if (pageNum > 1) {
        const topRuleY = this.pageHeight - 34;
        overlay += `q\n0.84 0.86 0.9 RG\n0.75 w\n${this.leftMargin} ${topRuleY} m ${this.rightMargin} ${topRuleY} l\nS\nQ\n`;
        const headerTitle = `LifeLine LK  |  Blood Request & Donation Summary Report  (${reportData.appliedRange.from} to ${reportData.appliedRange.to})`;
        const escapedHeader = headerTitle.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        overlay += `BT\n/F1 7.5 Tf\n0.42 0.46 0.52 rg\n${this.leftMargin} ${(topRuleY + 5).toFixed(2)} Td\n(${escapedHeader}) Tj\nET\n`;
      }

      // Footer on all pages
      const footRuleY = this.bottomMargin - 12;
      const footTextY = this.bottomMargin - 24;

      overlay += `q\n0.84 0.86 0.9 RG\n0.75 w\n${this.leftMargin} ${footRuleY} m ${this.rightMargin} ${footRuleY} l\nS\nQ\n`;

      const footLeft = `LifeLine LK Blood Bank Management  |  Confidential Administrative Audit Snapshot  |  ${reportData.generatedAtColombo}`;
      const escapedFootLeft = footLeft.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      overlay += `BT\n/F1 7.5 Tf\n0.45 0.48 0.55 rg\n${this.leftMargin} ${footTextY} Td\n(${escapedFootLeft}) Tj\nET\n`;

      const pageStr = `Page ${pageNum} of ${totalPages}`;
      const pageX = this.rightMargin - pageStr.length * 4.8;
      overlay += `BT\n/F2 7.5 Tf\n0.35 0.38 0.45 rg\n${pageX.toFixed(2)} ${footTextY} Td\n(${pageStr}) Tj\nET\n`;

      this.pages[i] += overlay;
    }

    const chunks: string[] = [];
    const initialHeader = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    chunks.push(initialHeader);
    const objOffsets: number[] = [0];
    let currentPos = initialHeader.length;

    const addObj = (str: string) => {
      objOffsets.push(currentPos);
      const full = `${objOffsets.length - 1} 0 obj\n${str}\nendobj\n`;
      chunks.push(full);
      currentPos += Buffer.byteLength(full, 'utf8');
    };

    const kids: string[] = [];
    for (let i = 0; i < totalPages; i++) {
      kids.push(`${6 + i} 0 R`);
    }

    // 1: Catalog
    addObj('<< /Type /Catalog /Pages 2 0 R >>');
    // 2: Pages
    addObj(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>`);
    // 3: Font F1 (Helvetica)
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    // 4: Font F2 (Helvetica-Bold)
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    // 5: Font F3 (Helvetica-Oblique)
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');

    // Page objects: 6 .. 5 + totalPages
    for (let i = 0; i < totalPages; i++) {
      const contentId = 6 + totalPages + i;
      addObj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(
          2,
        )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`,
      );
    }

    // Content streams: 6 + totalPages .. 5 + 2 * totalPages
    for (let i = 0; i < totalPages; i++) {
      const pageStr = this.pages[i] || '';
      const streamBuf = Buffer.from(pageStr, 'utf8');
      addObj(`<< /Length ${streamBuf.length} >>\nstream\n${pageStr}endstream`);
    }

    // Info obj
    const nowIso = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
    const infoId = 6 + 2 * totalPages;
    const escapedTitle = reportData.reportTitle.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    addObj(
      `<< /Title (${escapedTitle}) /Author (LifeLine LK Admin Portal) /CreationDate (D:${nowIso}) /Producer (LifeLine PureTS PDF Generator) >>`,
    );

    // xref table (exact 20-byte entries with \r\n)
    const xrefOffset = currentPos;
    let xref = `xref\r\n0 ${objOffsets.length}\r\n0000000000 65535 f \r\n`;
    for (let i = 1; i < objOffsets.length; i++) {
      xref += `${String(objOffsets[i]).padStart(10, '0')} 00000 n \r\n`;
    }
    chunks.push(xref);

    // trailer
    const trailer = `trailer\r\n<< /Size ${objOffsets.length} /Root 1 0 R /Info ${infoId} 0 R >>\r\nstartxref\r\n${xrefOffset}\r\n%%EOF\r\n`;
    chunks.push(trailer);

    return Buffer.concat(chunks.map((c) => Buffer.from(c, 'utf8')));
  }
}

/**
 * Generates an authoritative multi-page vector PDF for the admin blood report.
 */
export function generateReportPdf(reportData: AdminReportData): Buffer {
  const doc = new ReportPdfBuilder();

  // 1. Top Brand Header
  doc.rect(40, doc.getCurrentY() - 44, 515.28, 44, [0.65, 0.1, 0.12]);
  doc.text('LIFELINE LK  |  BLOOD DONOR-RECIPIENT MATCHING PORTAL', 52, doc.getCurrentY() - 17, 8.5, 'Helvetica-Bold', [1, 1, 1]);
  doc.text(reportData.reportTitle, 52, doc.getCurrentY() - 34, 15, 'Helvetica-Bold', [1, 1, 1]);
  doc.advanceY(52);

  // 2. Metadata Box
  doc.rect(40, doc.getCurrentY() - 48, 515.28, 48, [0.97, 0.98, 0.99], [0.85, 0.88, 0.92], 0.75);

  doc.text('Applied Period (Inclusive):', 50, doc.getCurrentY() - 16, 8, 'Helvetica-Bold', [0.4, 0.45, 0.5]);
  doc.text(`${reportData.appliedRange.from}  to  ${reportData.appliedRange.to}`, 170, doc.getCurrentY() - 16, 8.5, 'Helvetica-Bold', [0.1, 0.14, 0.2]);

  doc.text('Timezone Authority:', 340, doc.getCurrentY() - 16, 8, 'Helvetica-Bold', [0.4, 0.45, 0.5]);
  doc.text(reportData.appliedRange.timezone, 430, doc.getCurrentY() - 16, 8, 'Helvetica', [0.1, 0.14, 0.2]);

  doc.text('Generated At (Colombo):', 50, doc.getCurrentY() - 36, 8, 'Helvetica-Bold', [0.4, 0.45, 0.5]);
  doc.text(reportData.generatedAtColombo, 170, doc.getCurrentY() - 36, 8.5, 'Helvetica', [0.1, 0.14, 0.2]);

  doc.text('UTC Interval Boundary:', 340, doc.getCurrentY() - 36, 8, 'Helvetica-Bold', [0.4, 0.45, 0.5]);
  const utcSpan = `[${reportData.appliedRange.startUtcIso.slice(0, 10)} ... ${reportData.appliedRange.endExclusiveUtcIso.slice(0, 10)})`;
  doc.text(utcSpan, 430, doc.getCurrentY() - 36, 7.5, 'Helvetica', [0.4, 0.45, 0.5]);

  doc.advanceY(56);

  // 3. KPI Grid
  const kpiCards = [
    {
      title: 'PATIENT REQUESTS',
      main: String(reportData.metrics.patientRequests.totalCreated),
      sub: 'Created in selected period',
    },
    {
      title: 'DELIVERY ARRIVALS',
      main: String(reportData.metrics.deliveryArrivals.confirmedCount),
      sub: 'Courier arrival confirmed',
    },
    {
      title: 'DONATION INVITATIONS',
      main: `${reportData.metrics.donationInvitations.createdCount} / ${reportData.metrics.donationInvitations.publishedCount}`,
      sub: 'Created vs Published in period',
    },
    {
      title: 'DONOR WILLINGNESS',
      main: `${reportData.metrics.donorWillingness.acceptedOffersCount}`,
      sub: `${reportData.metrics.donorWillingness.uniqueRespondingDonors} unique responding donors`,
    },
    {
      title: 'RECIPIENT ACCOUNTS',
      main: String(reportData.metrics.registeredAccounts.recipientAccountsCount),
      sub: 'Current registered accounts - all dates',
    },
    {
      title: 'DONOR ACCOUNTS',
      main: String(reportData.metrics.registeredAccounts.donorAccountsCount),
      sub: 'Current registered accounts - all dates',
    },
  ];
  doc.drawKpiGrid(kpiCards);

  // 4. Section A: Patient Blood Requests - Status Breakdown
  const totalReq = reportData.metrics.patientRequests.totalCreated;
  const statusLabels: Record<string, string> = {
    pending_verification: 'Pending Verification (Awaiting Admin Review)',
    verified: 'Verified (Approved & Ready for Delivery Assignment)',
    in_progress: 'In Progress (Courier Dispatched / Active)',
    fulfilled: 'Fulfilled (Blood Received / Units Transferred)',
    cancelled: 'Cancelled (Withdrawn by Requester)',
    rejected: 'Rejected (Declined by Hospital Reviewer)',
  };

  const statusRows = Object.entries(reportData.metrics.patientRequests.statusBreakdown).map(
    ([statusKey, count]) => {
      const pct = totalReq > 0 ? ((count / totalReq) * 100).toFixed(1) + '%' : '0.0%';
      return [statusLabels[statusKey] || statusKey, String(count), pct];
    },
  );

  doc.drawTable(
    [
      { header: 'Current Lifecycle Status', width: 335, align: 'left' },
      { header: 'Count', width: 90, align: 'right' },
      { header: 'Share (%)', width: 90.28, align: 'right' },
    ],
    statusRows,
    '1. Patient Blood Requests — Current Lifecycle Status Breakdown',
    'Note: Counts reflect requests created in the selected period. Statuses represent current saved lifecycle state at report generation time.',
  );

  // 5. Section B: Hospital Breakdown
  const hospitalRows = reportData.metrics.patientRequests.byHospital.map((h) => [
    h.hospitalName,
    h.hospitalId,
    String(h.count),
    `${h.unitsRequired} units`,
  ]);

  doc.drawTable(
    [
      { header: 'Hospital / Facility Name', width: 235, align: 'left' },
      { header: 'Facility ID', width: 100, align: 'left' },
      { header: 'Requests Created', width: 90, align: 'right' },
      { header: 'Volume Required', width: 90.28, align: 'right' },
    ],
    hospitalRows,
    '2. Patient Blood Requests — Hospital Breakdown',
    'Note: Derived from active hospital registry catalogue. Represents request counts created within the selected period.',
  );

  // 6. Section C: Blood Group Breakdown
  const bgRows = Object.entries(reportData.metrics.patientRequests.byBloodGroup).map(
    ([bg, stats]) => [bg, String(stats.count), `${stats.unitsRequired} units`],
  );

  doc.drawTable(
    [
      { header: 'Blood Group', width: 215, align: 'left' },
      { header: 'Patient Requests Created', width: 150, align: 'right' },
      { header: 'Total Units Requested', width: 150.28, align: 'right' },
    ],
    bgRows,
    '3. Patient Blood Requests — Blood Group Distribution',
    'Note: Covers all eight recognized ABO/Rh blood groups.',
  );

  // 7. Section D: Donation Invitations & Donor Willingness Breakdown
  const inv = reportData.metrics.donationInvitations;
  const dw = reportData.metrics.donorWillingness;
  const invRows = [
    ['Invitations Created in Period', String(inv.createdCount), 'Invitations drafted or published with createdAt in selected interval'],
    ['Invitations Published in Period', String(inv.publishedCount), 'Invitations published to donors during selected interval (including subsequently closed)'],
    ['Created Status: Draft', String(inv.createdStatusBreakdown.draft), 'Invitations created in period still in draft status'],
    ['Created Status: Published', String(inv.createdStatusBreakdown.published), 'Invitations created in period currently published and open'],
    ['Created Status: Closed', String(inv.createdStatusBreakdown.closed), 'Invitations created in period subsequently closed or concluded'],
    ['Donor Willingness Offers (Total)', String(dw.acceptedOffersCount), 'Accepted DonationResponse records submitted by donors in period'],
    ['Unique Responding Donors', String(dw.uniqueRespondingDonors), 'Distinct individual donors submitting willingness responses in period'],
  ];

  doc.drawTable(
    [
      { header: 'Metric Name', width: 190, align: 'left' },
      { header: 'Count', width: 85, align: 'right' },
      { header: 'Operational Definition', width: 240.28, align: 'left' },
    ],
    invRows,
    '4. Donation Invitations & Donor Willingness Breakdown',
    'Note: Donor willingness responses (DonationResponse) express intent to donate and do not confirm completed blood donations or appointments.',
  );

  // 8. Section E: Methodology & Audit Disclaimers Box
  doc.drawNotesBox('5. Methodology, Metric Definitions & Regulatory Disclaimers', [
    reportData.notes.patientRequestsNote,
    reportData.notes.deliveryArrivalsNote,
    reportData.notes.donationInvitationsNote,
    reportData.notes.donorWillingnessNote,
    reportData.notes.registeredAccountsNote,
    reportData.notes.generalDisclaimer,
  ]);

  return doc.build(reportData);
}
