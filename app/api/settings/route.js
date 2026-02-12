import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        rate,
        min_project as "minProject",
        landing_page_price as "landingPagePrice",
        show_internal_costs as "showInternalCosts",
        theme
      FROM settings
      WHERE id = 1
    `;

    if (rows.length === 0) {
      // Return defaults if no settings found
      return NextResponse.json({
        settings: {
          rate: 175,
          minProject: 1750,
          landingPagePrice: 700,
          showInternalCosts: false,
          theme: 'dark'
        }
      });
    }

    return NextResponse.json({ settings: rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const { rows } = await sql`
      UPDATE settings SET
        rate = COALESCE(${body.rate}, rate),
        min_project = COALESCE(${body.minProject}, min_project),
        landing_page_price = COALESCE(${body.landingPagePrice}, landing_page_price),
        show_internal_costs = COALESCE(${body.showInternalCosts}, show_internal_costs),
        theme = COALESCE(${body.theme}, theme)
      WHERE id = 1
      RETURNING
        rate,
        min_project as "minProject",
        landing_page_price as "landingPagePrice",
        show_internal_costs as "showInternalCosts",
        theme
    `;

    return NextResponse.json({ settings: rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
