import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { quotes, settings } = await request.json();

    // Insert settings
    if (settings) {
      await sql`
        UPDATE settings SET
          rate = ${settings.rate || 175},
          min_project = ${settings.minProject || 1750},
          landing_page_price = ${settings.landingPagePrice || 700},
          show_internal_costs = ${settings.showInternalCosts || false}
        WHERE id = 1
      `;
    }

    // Insert quotes (skip duplicates)
    let successCount = 0;
    let skipCount = 0;

    for (const quote of quotes) {
      try {
        await sql`
          INSERT INTO quotes (
            id, client_name, project_name, pages,
            include_design, include_dev, include_copy,
            is_landing_page, add_blog, add_shop,
            custom_post_types, plugins,
            include_pm, include_contingency,
            discount_type, discount_value,
            total, status, notes, created_at
          ) VALUES (
            ${quote.id},
            ${quote.clientName || ''},
            ${quote.projectName || ''},
            ${quote.pages},
            ${quote.includeDesign},
            ${quote.includeDev},
            ${quote.includeCopy},
            ${quote.isLandingPage},
            ${quote.addBlog},
            ${quote.addShop},
            ${JSON.stringify(quote.customPostTypes || [])},
            ${JSON.stringify(quote.plugins || [])},
            ${quote.includePM},
            ${quote.includeContingency},
            ${quote.discountType},
            ${quote.discountValue},
            ${quote.total},
            ${quote.status},
            ${quote.notes || ''},
            ${quote.createdAt}
          )
        `;
        successCount++;
      } catch (err) {
        // Skip duplicates
        if (err.code === '23505') {
          skipCount++;
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: successCount,
      skipped: skipCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + error.message },
      { status: 500 }
    );
  }
}
