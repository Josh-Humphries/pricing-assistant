import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        id,
        client_name as "clientName",
        project_name as "projectName",
        pages,
        include_design as "includeDesign",
        include_dev as "includeDev",
        include_copy as "includeCopy",
        is_landing_page as "isLandingPage",
        add_blog as "addBlog",
        add_shop as "addShop",
        custom_post_types as "customPostTypes",
        plugins,
        include_pm as "includePM",
        include_contingency as "includeContingency",
        discount_type as "discountType",
        discount_value as "discountValue",
        total,
        status,
        notes,
        created_at as "createdAt"
      FROM quotes
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ quotes: rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const { rows } = await sql`
      INSERT INTO quotes (
        id, client_name, project_name, pages,
        include_design, include_dev, include_copy,
        is_landing_page, add_blog, add_shop,
        custom_post_types, plugins,
        include_pm, include_contingency,
        discount_type, discount_value,
        total, status, notes
      ) VALUES (
        ${body.id},
        ${body.clientName || ''},
        ${body.projectName || ''},
        ${body.pages},
        ${body.includeDesign},
        ${body.includeDev},
        ${body.includeCopy},
        ${body.isLandingPage},
        ${body.addBlog},
        ${body.addShop},
        ${JSON.stringify(body.customPostTypes || [])},
        ${JSON.stringify(body.plugins || [])},
        ${body.includePM},
        ${body.includeContingency},
        ${body.discountType},
        ${body.discountValue},
        ${body.total},
        ${body.status},
        ${body.notes || ''}
      )
      RETURNING
        id,
        client_name as "clientName",
        project_name as "projectName",
        pages,
        include_design as "includeDesign",
        include_dev as "includeDev",
        include_copy as "includeCopy",
        is_landing_page as "isLandingPage",
        add_blog as "addBlog",
        add_shop as "addShop",
        custom_post_types as "customPostTypes",
        plugins,
        include_pm as "includePM",
        include_contingency as "includeContingency",
        discount_type as "discountType",
        discount_value as "discountValue",
        total,
        status,
        notes,
        created_at as "createdAt"
    `;

    return NextResponse.json({ quote: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
