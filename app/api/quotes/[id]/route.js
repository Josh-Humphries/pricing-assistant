import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const { rows } = await sql`
      UPDATE quotes SET
        client_name = ${body.clientName || ''},
        project_name = ${body.projectName || ''},
        pages = ${body.pages},
        include_design = ${body.includeDesign},
        include_dev = ${body.includeDev},
        include_copy = ${body.includeCopy},
        is_landing_page = ${body.isLandingPage},
        add_blog = ${body.addBlog},
        add_shop = ${body.addShop},
        custom_post_types = ${JSON.stringify(body.customPostTypes || [])},
        plugins = ${JSON.stringify(body.plugins || [])},
        include_pm = ${body.includePM},
        include_contingency = ${body.includeContingency},
        discount_type = ${body.discountType},
        discount_value = ${body.discountValue},
        total = ${body.total},
        status = ${body.status},
        notes = ${body.notes || ''}
      WHERE id = ${id}
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

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ quote: rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const { rowCount } = await sql`
      DELETE FROM quotes WHERE id = ${id}
    `;

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
