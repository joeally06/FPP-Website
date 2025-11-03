import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const range = searchParams.get('range') || '7d';
    const days = range === '30d' ? 30 : 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all data
    const pageViews = db.prepare(`
      SELECT * FROM page_views WHERE view_time >= ? ORDER BY view_time DESC
    `).all(startDateStr);

    const votes = db.prepare(`
      SELECT * FROM votes WHERE created_at >= ? ORDER BY created_at DESC
    `).all(startDateStr);

    const santaLetters = db.prepare(`
      SELECT * FROM santa_letters ORDER BY created_at DESC
    `).all();

    if (format === 'json') {
      return NextResponse.json({
        exportDate: new Date().toISOString(),
        range,
        data: {
          pageViews,
          votes,
          santaLetters,
        },
      }, {
        headers: {
          'Content-Disposition': `attachment; filename="analytics-${range}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    if (format === 'csv') {
      let csv = 'PAGE VIEWS\n';
      csv += 'Session ID,Page,View Time\n';
      pageViews.forEach((view: any) => {
        csv += `"${view.session_id}","${view.page_path}","${view.view_time}"\n`;
      });

      csv += '\n\nVOTES\n';
      csv += 'IP,Sequence,Vote Type,Created At\n';
      votes.forEach((vote: any) => {
        csv += `"${vote.user_ip}","${vote.sequence_name}","${vote.vote_type}","${vote.created_at}"\n`;
      });

      csv += '\n\nSANTA LETTERS\n';
      csv += 'Name,Email,Message,Status,Created At\n';
      santaLetters.forEach((letter: any) => {
        csv += `"${letter.child_name}","${letter.parent_email}","${letter.letter_text.replace(/"/g, '""')}","${letter.status}","${letter.created_at}"\n`;
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${range}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF, return a simple HTML that can be printed to PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            .summary { background: #f9f9f9; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>FPP Show Analytics Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Range: Last ${days} days</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <p>Total Page Views: ${pageViews.length}</p>
            <p>Total Votes: ${votes.length}</p>
            <p>Total Santa Letters: ${santaLetters.length}</p>
          </div>

          <h2>Recent Page Views</h2>
          <table>
            <tr><th>Page</th><th>Date</th></tr>
            ${pageViews.slice(0, 50).map((view: any) => `
              <tr>
                <td>${view.page_path}</td>
                <td>${new Date(view.view_time).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>

          <h2>Recent Votes</h2>
          <table>
            <tr><th>Sequence</th><th>Vote Type</th><th>Date</th></tr>
            ${votes.slice(0, 50).map((vote: any) => `
              <tr>
                <td>${vote.sequence_name}</td>
                <td>${vote.vote_type === 'up' ? '👍 Up' : '👎 Down'}</td>
                <td>${new Date(vote.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>

          <script>window.print();</script>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
