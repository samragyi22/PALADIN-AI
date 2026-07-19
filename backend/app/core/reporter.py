import io
from datetime import datetime
from typing import List, Dict, Any
import matplotlib
# Use non-interactive Agg backend to prevent threading/GUI warnings in backend threads
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors

def generate_chart_image(chart_config: Dict[str, Any]) -> bytes:
    """
    Render chart JSON config into static PNG bytes using matplotlib.
    """
    try:
        data = chart_config["data"]
        x_col = chart_config["xAxis"]
        y_col = chart_config["yAxis"]
        title = chart_config["title"]
        chart_type = chart_config.get("type", "bar")
        
        # Prepare data
        x_vals = [str(row.get(x_col, "")) for row in data]
        y_vals = []
        for row in data:
            try:
                y_vals.append(float(row.get(y_col, 0)))
            except (ValueError, TypeError):
                y_vals.append(0.0)
                
        fig, ax = plt.subplots(figsize=(6, 3))
        
        # Plot styling colors
        primary_color = '#6366F1'  # Indigo
        accent_colors = ['#6366F1', '#0D9488', '#F97316', '#A855F7', '#EC4899', '#3B82F6']
        
        if chart_type == "line":
            ax.plot(x_vals, y_vals, marker='o', color=primary_color, linewidth=2, markersize=5)
            ax.grid(True, linestyle='--', alpha=0.3, color='#94a3b8')
        elif chart_type == "pie":
            ax.pie(
                y_vals, 
                labels=x_vals[:6],  # limit label noise
                autopct='%1.1f%%', 
                colors=accent_colors[:len(x_vals)],
                textprops={'fontsize': 8}
            )
        else:
            # Bar chart
            bars = ax.bar(x_vals, y_vals, color=primary_color, width=0.45)
            # Add grid lines
            ax.set_axisbelow(True)
            ax.yaxis.grid(True, linestyle='--', alpha=0.3, color='#94a3b8')
            
        ax.set_title(title, fontsize=10, fontweight='bold', color='#1e293b')
        ax.tick_params(axis='both', which='major', labelsize=8, colors='#64748b')
        
        # Clean borders
        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
        for spine in ["left", "bottom"]:
            ax.spines[spine].set_color('#cbd5e1')
            
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()
    except Exception as e:
        print(f"Failed to generate chart image: {e}")
        return b""

def compile_pdf_report(session_history: List[Dict[str, Any]], session_id: str) -> bytes:
    """
    Generate professional session analytical report using ReportLab.
    Returns: PDF binary stream.
    """
    buffer = io.BytesIO()
    
    # Page template setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styled text blocks
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0B0F19'),
        spaceAfter=6
    )
    
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=20
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#6366F1'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=10
    )
    
    query_style = ParagraphStyle(
        'QueryText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=8
    )
    
    citation_style = ParagraphStyle(
        'CitationText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0D9488'),
        spaceBefore=4,
        spaceAfter=4
    )

    story = []
    
    # Header block
    story.append(Paragraph("Enterprise AI Analyst", title_style))
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    story.append(Paragraph(f"Analytical Session Report • Session: {session_id} • Exported: {timestamp}", meta_style))
    story.append(Spacer(1, 10))
    
    if not session_history:
        story.append(Paragraph("No queries recorded in this session history.", body_style))
    else:
        for idx, entry in enumerate(session_history):
            elements = []
            
            # 1. User Query Header
            elements.append(Paragraph(f"Q{idx+1}: {entry['query']}", query_style))
            
            # 2. Synthesized Answer Paragraph
            elements.append(Paragraph(entry["answer"], body_style))
            
            # 3. Render SQL Query
            if entry.get("sql_query"):
                sql_style = ParagraphStyle(
                    'SQLPre',
                    parent=styles['Code'],
                    fontName='Courier',
                    fontSize=8,
                    leading=10,
                    textColor=colors.HexColor('#F97316'),
                    backColor=colors.HexColor('#F8FAFC'),
                    borderColor=colors.HexColor('#E2E8F0'),
                    borderWidth=0.5,
                    borderPadding=6,
                    spaceAfter=8
                )
                elements.append(Paragraph(f"<b>SQL Query:</b><br/>{entry['sql_query']}", sql_style))
                
            # 4. Render SQL Table Results
            if entry.get("sql_results"):
                results = entry["sql_results"]
                cols = list(results[0].keys())
                
                # Setup table grid matrix
                table_data = [cols] # Header row
                for row in results[:10]: # limit rows embedded in PDF to keep report compact
                    table_data.append([str(row.get(c, "")) for c in cols])
                    
                if len(results) > 10:
                    table_data.append([f"... and {len(results)-10} more rows" for _ in cols])
                    
                col_widths = [doc.width / len(cols)] * len(cols)
                t = Table(table_data, colWidths=col_widths, repeatRows=1)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366F1')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                    ('TOPPADDING', (0, 0), (-1, 0), 6),
                    # ROWBACKGROUNDS: apply alternating row colors from row index 1 to last row (-1)
                    # Always use (0, 1) to (-1, -1) — never use a reversed range like (-1, -2)
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F8FAFC'), colors.white]),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
                    ('TOPPADDING', (0, 1), (-1, -1), 4),
                ]))
                elements.append(Spacer(1, 4))
                elements.append(t)
                elements.append(Spacer(1, 8))
                
            # 5. Render Chart configuration
            if entry.get("chart_config"):
                chart_bytes = generate_chart_image(entry["chart_config"])
                if chart_bytes:
                    img_flowable = Image(io.BytesIO(chart_bytes), width=doc.width, height=180)
                    elements.append(Spacer(1, 4))
                    elements.append(img_flowable)
                    elements.append(Spacer(1, 8))
                    
            # 6. Render Citations
            if entry.get("citations"):
                elements.append(Paragraph("<b>Citations:</b>", section_title_style))
                for c_idx, cit in enumerate(entry["citations"]):
                    cit_str = f"[{c_idx+1}] {cit['source']} (Page {cit['page']}): \"{cit['text']}\""
                    elements.append(Paragraph(cit_str, citation_style))
                    
            # Wrap query block together so it doesn't break across page gaps awkwardly
            story.append(KeepTogether(elements))
            story.append(Spacer(1, 14))
            
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
